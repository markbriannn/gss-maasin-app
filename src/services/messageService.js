import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import {db} from '../config/firebase';
import notificationService from './notificationService';

// Collection names
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Create or get existing conversation between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string|null} jobId - Optional job ID to link conversation to a specific job
 * @param {string|null} recipientRole - Optional role of recipient (CLIENT/PROVIDER) for admin conversations
 */
export const getOrCreateConversation = async (
  userId1,
  userId2,
  jobId = null,
  recipientRole = null,
) => {
  try {
    console.log('[getOrCreateConversation] Called with:');
    console.log('[getOrCreateConversation] - userId1 (sender):', userId1);
    console.log('[getOrCreateConversation] - userId2 (recipient):', userId2);
    console.log('[getOrCreateConversation] - jobId:', jobId);
    console.log('[getOrCreateConversation] - recipientRole:', recipientRole);

    // Validate inputs
    if (!userId1 || !userId2) {
      console.error('[getOrCreateConversation] ERROR: Missing user IDs!', {userId1, userId2});
      throw new Error('Both user IDs are required');
    }

    // Check if conversation already exists
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);

    // Query for existing conversation between these users
    const q = query(conversationsRef, where('participants', 'array-contains', userId1));

    const snapshot = await getDocs(q);
    let existingConversation = null;
    let fallbackConversation = null; // For backwards compatibility

    console.log('[getOrCreateConversation] Found', snapshot.docs.length, 'conversations containing userId1');

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // IMPORTANT: Verify BOTH participants are in the array to ensure conversation is valid
      const hasUser1 = data.participants?.includes(userId1);
      const hasUser2 = data.participants?.includes(userId2);
      
      console.log('[getOrCreateConversation] Checking conv:', docSnap.id, {
        participants: data.participants,
        hasUser1,
        hasUser2,
        jobId: data.jobId
      });
      
      if (hasUser1 && hasUser2) {
        // Priority 1: Exact match with jobId (if specified)
        if (jobId && data.jobId === jobId) {
          existingConversation = {id: docSnap.id, ...data};
          return;
        }

        // Priority 2: Match by recipientRole (if specified and no jobId)
        if (!jobId && recipientRole && data.recipientRole === recipientRole) {
          existingConversation = {id: docSnap.id, ...data};
          return;
        }

        // Priority 3: Any existing conversation between these users (fallback)
        // This handles old conversations without recipientRole
        if (!existingConversation && !fallbackConversation) {
          fallbackConversation = {id: docSnap.id, ...data};
        }
      }
    });

    // Use exact match if found, otherwise use fallback
    if (existingConversation) {
      console.log('[getOrCreateConversation] Using existing conversation:', existingConversation.id);
      return existingConversation;
    }

    if (fallbackConversation) {
      console.log('[getOrCreateConversation] Using fallback conversation:', fallbackConversation.id);
      // Update old conversation with recipientRole if not set
      if (recipientRole && !fallbackConversation.recipientRole) {
        const convRef = doc(db, CONVERSATIONS_COLLECTION, fallbackConversation.id);
        await updateDoc(convRef, {recipientRole: recipientRole});
        fallbackConversation.recipientRole = recipientRole;
      }
      return fallbackConversation;
    }

    // Create new conversation
    console.log('[getOrCreateConversation] Creating NEW conversation with participants:', [userId1, userId2]);
    const newConversation = {
      participants: [userId1, userId2],
      jobId: jobId,
      recipientRole: recipientRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null,
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0,
      },
    };

    const docRef = await addDoc(conversationsRef, newConversation);
    console.log('[getOrCreateConversation] Created conversation with ID:', docRef.id);
    console.log('[getOrCreateConversation] Participants saved:', [userId1, userId2]);
    return {id: docRef.id, ...newConversation};
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId,
  senderId,
  text,
  senderName = 'User',
  imageUrl = null,
) => {
  try {
    const messagesRef = collection(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
    );

    const newMessage = {
      text,
      senderId,
      senderName,
      timestamp: serverTimestamp(),
      read: false,
    };

    // Add image URL if provided
    if (imageUrl) {
      newMessage.imageUrl = imageUrl;
    }

    const docRef = await addDoc(messagesRef, newMessage);

    // Update conversation with last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const unreadCount = {...conversationData.unreadCount};

      // Increment unread count for other participants
      conversationData.participants.forEach((participantId) => {
        if (participantId !== senderId) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
        }
      });

      // Build update object - clear deleted flag for recipients so conversation reappears in their inbox
      const updateData = {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastSenderId: senderId,
        lastSenderName: senderName,
        updatedAt: serverTimestamp(),
        unreadCount,
      };
      
      // Clear deleted flag for all other participants (so conversation shows in their inbox again)
      conversationData.participants.forEach((participantId) => {
        if (participantId !== senderId) {
          updateData[`deleted.${participantId}`] = false;
        }
      });

      await updateDoc(conversationRef, updateData);

      // Send push notification to other participants
      conversationData.participants.forEach((participantId) => {
        if (participantId !== senderId) {
          notificationService
            .pushNewMessage(participantId, senderName, text, conversationId, senderId)
            .catch(() => {});
        }
      });
    }

    return {id: docRef.id, ...newMessage};
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
    );

    const snapshot = await getDocs(q);
    const conversations = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Get the other participant's info
      const otherUserId = data.participants.find((id) => id !== userId);
      let otherUser = {name: 'Unknown User'};

      if (otherUserId) {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Build name with multiple fallbacks
          let userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          if (!userName) {
            userName = userData.displayName || userData.name || null;
          }
          // For admins without a name, show "GSS Support"
          if (!userName && userData.role === 'ADMIN') {
            userName = 'GSS Support';
          }
          // Final fallback
          if (!userName) {
            userName = userData.email?.split('@')[0] || 'User';
          }
          
          otherUser = {
            id: otherUserId,
            name: userName,
            role: userData.role,
            profilePhoto: userData.profilePhoto || userData.photoURL || userData.avatar || null,
          };
        }
      }

      conversations.push({
        id: docSnap.id,
        ...data,
        otherUser,
        unreadCount: data.unreadCount?.[userId] || 0,
        lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
      });
    }

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

/**
 * Subscribe to messages in a conversation (real-time)
 * Filters out messages sent before the user deleted the conversation
 * @param {string} conversationId - The conversation ID
 * @param {function} callback - Callback function to receive messages
 * @param {string} userId - Optional user ID to filter messages based on deletedAt
 */
export const subscribeToMessages = (conversationId, callback, userId = null) => {
  try {
    const messagesRef = collection(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
    );
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    // First get the conversation to check deletedAt timestamp
    let userDeletedAt = null;
    
    if (userId) {
      getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId)).then((convSnap) => {
        if (convSnap.exists()) {
          const convData = convSnap.data();
          userDeletedAt = convData.deletedAt?.[userId]?.toDate?.() || null;
        }
      }).catch(() => {});
    }

    return onSnapshot(
      q,
      async (snapshot) => {
        // Re-fetch deletedAt in case it changed
        if (userId) {
          try {
            const convSnap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
            if (convSnap.exists()) {
              const convData = convSnap.data();
              userDeletedAt = convData.deletedAt?.[userId]?.toDate?.() || null;
            }
          } catch {}
        }
        
        const messages = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const msgTime = data.timestamp?.toDate?.() || new Date();
          
          // Filter out messages sent before user deleted the conversation
          if (userId && userDeletedAt && msgTime < userDeletedAt) {
            return; // Skip this message
          }
          
          messages.push({
            id: docSnap.id,
            ...data,
            timestamp: msgTime,
          });
        });
        
        callback(messages);
      },
      (error) => {
        // Handle Firestore internal errors gracefully
        console.log('Messages listener error (handled):', error?.message || error);
        // Return empty array on error
        callback([]);
      },
    );
  } catch (error) {
    console.log('Error setting up messages listener:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

/**
 * Subscribe to conversations (real-time) - for detecting new messages
 */
export const subscribeToConversations = (userId, callback) => {
  try {
    console.log('[MessageService] ========================================');
    console.log('[MessageService] SUBSCRIBING TO CONVERSATIONS');
    console.log('[MessageService] User ID:', userId);
    console.log('[MessageService] User ID type:', typeof userId);
    console.log('[MessageService] User ID length:', userId?.length);
    console.log('[MessageService] ========================================');
    
    if (!userId || typeof userId !== 'string') {
      console.error('[MessageService] INVALID USER ID! Cannot subscribe.');
      callback([]);
      return () => {};
    }
    
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(conversationsRef, where('participants', 'array-contains', userId));

    // ALSO do a one-time fetch to compare with real-time listener
    getDocs(q).then((snapshot) => {
      console.log('[MessageService] ONE-TIME FETCH RESULT:');
      console.log('[MessageService] Found', snapshot.docs.length, 'conversations via getDocs');
      snapshot.docs.forEach((docSnap, index) => {
        const data = docSnap.data();
        console.log(`[MessageService] [getDocs] Conv ${index + 1}: ${docSnap.id}, participants:`, data.participants);
      });
    }).catch((err) => {
      console.error('[MessageService] getDocs ERROR:', err);
    });

    return onSnapshot(
      q,
      async (snapshot) => {
        console.log('[MessageService] ========================================');
        console.log('[MessageService] SNAPSHOT RECEIVED');
        console.log('[MessageService] User ID used in query:', userId);
        console.log('[MessageService] Number of conversations found:', snapshot.docs.length);
        
        // Log ALL conversation IDs and their participants
        snapshot.docs.forEach((docSnap, index) => {
          const data = docSnap.data();
          console.log(`[MessageService] Conv ${index + 1}: ${docSnap.id}`);
          console.log(`[MessageService]   - participants:`, data.participants);
          console.log(`[MessageService]   - lastMessage:`, data.lastMessage?.substring(0, 30));
        });
        console.log('[MessageService] ========================================');
        
        const conversations = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          console.log('[MessageService] Conversation:', docSnap.id, 'participants:', data.participants);

          // Get the other participant's info
          const otherUserId = data.participants.find((id) => id !== userId);
          let otherUser = {name: 'Unknown User'};

          if (otherUserId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Build name with multiple fallbacks
                let userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                if (!userName) {
                  userName = userData.displayName || userData.name || null;
                }
                // For admins without a name, show "GSS Support"
                if (!userName && userData.role === 'ADMIN') {
                  userName = 'GSS Support';
                }
                // Final fallback
                if (!userName) {
                  userName = userData.email?.split('@')[0] || 'User';
                }
                
                otherUser = {
                  id: otherUserId,
                  name: userName,
                  role: userData.role,
                  profilePhoto:
                    userData.profilePhoto || userData.photoURL || userData.avatar || null,
                };
              }
            } catch (e) {
              console.log('Error fetching user:', e);
            }
          }

          conversations.push({
            id: docSnap.id,
            ...data,
            otherUser,
            unreadCount: data.unreadCount?.[userId] || 0,
            lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
          });
        }

        // Sort by last message time
        conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        callback(conversations);
      },
      (error) => {
        // Handle Firestore internal errors gracefully
        console.log('Conversations listener error (handled):', error?.message || error);
        // Return empty array on error
        callback([]);
      },
    );
  } catch (error) {
    console.log('Error setting up conversations listener:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

/**
 * Mark messages as read in a conversation
 */
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const unreadCount = {...data.unreadCount};
      unreadCount[userId] = 0;

      await updateDoc(conversationRef, {unreadCount});
    }

    // Also mark individual messages as read
    const messagesRef = collection(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
    );
    const q = query(messagesRef, where('read', '==', false));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      if (docSnap.data().senderId !== userId) {
        batch.update(docSnap.ref, {read: true});
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
};

/**
 * Get total unread message count for a user
 */
export const getTotalUnreadCount = async (userId) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(conversationsRef, where('participants', 'array-contains', userId));

    const snapshot = await getDocs(q);
    let totalUnread = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalUnread += data.unreadCount?.[userId] || 0;
    });

    return totalUnread;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Subscribe to unread count changes
 */
export const subscribeToUnreadCount = (userId, callback) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(conversationsRef, where('participants', 'array-contains', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        let totalUnread = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalUnread += data.unreadCount?.[userId] || 0;
        });
        callback(totalUnread);
      },
      (error) => {
        console.log('Unread count listener error (handled):', error?.message || error);
        callback(0);
      },
    );
  } catch (error) {
    console.log('Error setting up unread count listener:', error);
    return () => {};
  }
};

/**
 * Set typing status for a user in a conversation
 */
export const setTypingStatus = async (conversationId, userId, isTyping) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      [`typing.${userId}`]: isTyping,
      [`typingTimestamp.${userId}`]: isTyping ? serverTimestamp() : null,
    });
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

/**
 * Subscribe to typing status in a conversation
 */
export const subscribeToTypingStatus = (conversationId, currentUserId, callback) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

    return onSnapshot(
      conversationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const typing = data.typing || {};

          // Check if any other user is typing
          let otherUserTyping = false;
          for (const [userId, isTyping] of Object.entries(typing)) {
            if (userId !== currentUserId && isTyping) {
              // Check if typing timestamp is recent (within last 5 seconds)
              const typingTimestamp = data.typingTimestamp?.[userId];
              if (typingTimestamp) {
                const timestampDate = typingTimestamp.toDate?.() || new Date(typingTimestamp);
                const now = new Date();
                const diffSeconds = (now - timestampDate) / 1000;
                if (diffSeconds < 5) {
                  otherUserTyping = true;
                }
              } else {
                otherUserTyping = true;
              }
            }
          }
          callback(otherUserTyping);
        }
      },
      (error) => {
        console.log('Typing status listener error (handled):', error?.message || error);
        callback(false);
      },
    );
  } catch (error) {
    console.log('Error setting up typing status listener:', error);
    return () => {};
  }
};

/**
 * Delete a conversation for a specific user (soft delete - marks as deleted for that user)
 * Also stores the timestamp so we can hide messages before this time
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID who is deleting
 */
export const deleteConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const deleted = data.deleted || {};
      const deletedAt = data.deletedAt || {};
      
      deleted[userId] = true;
      deletedAt[userId] = serverTimestamp(); // Store when user deleted

      await updateDoc(conversationRef, {deleted, deletedAt});
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

/**
 * Archive a conversation for a specific user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID who is archiving
 */
export const archiveConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const archived = data.archived || {};
      archived[userId] = true;

      await updateDoc(conversationRef, {archived});
    }
  } catch (error) {
    console.error('Error archiving conversation:', error);
    throw error;
  }
};

/**
 * Unarchive a conversation for a specific user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID who is unarchiving
 */
export const unarchiveConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      const archived = data.archived || {};
      archived[userId] = false;

      await updateDoc(conversationRef, {archived});
    }
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    throw error;
  }
};

/**
 * Add or remove a reaction to a message
 * @param {string} conversationId - The conversation ID
 * @param {string} messageId - The message ID
 * @param {string} userId - The user ID adding the reaction
 * @param {string} userName - The user's name
 * @param {string} emoji - The emoji reaction
 */
export const toggleReaction = async (conversationId, messageId, userId, userName, emoji) => {
  try {
    const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId);
    const messageSnap = await getDoc(messageRef);

    if (messageSnap.exists()) {
      const data = messageSnap.data();
      let reactions = data.reactions || [];

      // Check if user already reacted with this emoji
      const existingIndex = reactions.findIndex(
        r => r.userId === userId && r.emoji === emoji
      );

      if (existingIndex >= 0) {
        // Remove reaction if same emoji clicked
        reactions = reactions.filter((_, i) => i !== existingIndex);
      } else {
        // Remove any existing reaction from this user and add new one
        reactions = reactions.filter(r => r.userId !== userId);
        reactions.push({
          emoji,
          userId,
          userName,
        });
      }

      await updateDoc(messageRef, {reactions});
      return reactions;
    }
    return [];
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
};


/**
 * Scan and fix broken conversations where a user should be a participant but isn't
 * This can happen when conversations were created with incorrect participant arrays
 * @param {string} userId - The user ID to check and fix conversations for
 */
export const scanAndFixBrokenConversations = async (userId) => {
  try {
    console.log('[MessageService] Scanning ALL conversations to fix broken ones for user:', userId);
    
    // Get ALL conversations (not just ones containing this user)
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const allConversationsSnapshot = await getDocs(conversationsRef);
    
    console.log('[MessageService] Total conversations in database:', allConversationsSnapshot.docs.length);
    
    let fixedCount = 0;
    
    for (const docSnap of allConversationsSnapshot.docs) {
      const data = docSnap.data();
      const participants = data.participants || [];
      
      console.log('[MessageService] Checking conversation:', docSnap.id, 'participants:', participants);
      
      // Skip if user is already in participants
      if (participants.includes(userId)) {
        continue;
      }
      
      // Check if this conversation should include this user:
      // 1. Check messages subcollection for messages from/to this user
      // 2. Check unreadCount for this user
      // 3. Check if lastSenderId matches (user sent a message)
      
      let userShouldBeParticipant = false;
      let reason = '';
      
      // Check unreadCount
      if (data.unreadCount && data.unreadCount[userId] !== undefined) {
        userShouldBeParticipant = true;
        reason = 'unreadCount contains userId';
      }
      
      // Check messages subcollection
      if (!userShouldBeParticipant) {
        try {
          const messagesRef = collection(db, CONVERSATIONS_COLLECTION, docSnap.id, MESSAGES_COLLECTION);
          const messagesSnapshot = await getDocs(messagesRef);
          
          for (const msgDoc of messagesSnapshot.docs) {
            const msgData = msgDoc.data();
            if (msgData.senderId === userId) {
              userShouldBeParticipant = true;
              reason = 'user sent a message in this conversation';
              break;
            }
          }
        } catch (e) {
          console.log('[MessageService] Error checking messages:', e);
        }
      }
      
      if (userShouldBeParticipant) {
        console.log('[MessageService] FIXING broken conversation:', docSnap.id);
        console.log('[MessageService] Reason:', reason);
        console.log('[MessageService] Old participants:', participants);
        const newParticipants = [...participants, userId];
        console.log('[MessageService] New participants:', newParticipants);
        
        try {
          await updateDoc(doc(db, CONVERSATIONS_COLLECTION, docSnap.id), {
            participants: newParticipants,
          });
          fixedCount++;
          console.log('[MessageService] Successfully fixed conversation:', docSnap.id);
        } catch (updateError) {
          console.error('[MessageService] Error updating conversation:', updateError);
        }
      }
    }
    
    console.log('[MessageService] Fixed', fixedCount, 'broken conversations for user:', userId);
    return fixedCount;
  } catch (error) {
    console.error('[MessageService] Error scanning/fixing conversations:', error);
    return 0;
  }
};
