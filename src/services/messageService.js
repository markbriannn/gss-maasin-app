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
export const getOrCreateConversation = async (userId1, userId2, jobId = null, recipientRole = null) => {
  try {
    // Check if conversation already exists
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    
    // Query for existing conversation between these users
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId1)
    );
    
    const snapshot = await getDocs(q);
    let existingConversation = null;
    let fallbackConversation = null; // For backwards compatibility
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(userId2)) {
        // Priority 1: Exact match with jobId (if specified)
        if (jobId && data.jobId === jobId) {
          existingConversation = { id: doc.id, ...data };
          return;
        }
        
        // Priority 2: Match by recipientRole (if specified and no jobId)
        if (!jobId && recipientRole && data.recipientRole === recipientRole) {
          existingConversation = { id: doc.id, ...data };
          return;
        }
        
        // Priority 3: Any existing conversation between these users (fallback)
        // This handles old conversations without recipientRole
        if (!existingConversation && !fallbackConversation) {
          fallbackConversation = { id: doc.id, ...data };
        }
      }
    });
    
    // Use exact match if found, otherwise use fallback
    if (existingConversation) {
      return existingConversation;
    }
    
    if (fallbackConversation) {
      // Update old conversation with recipientRole if not set
      if (recipientRole && !fallbackConversation.recipientRole) {
        const convRef = doc(db, CONVERSATIONS_COLLECTION, fallbackConversation.id);
        await updateDoc(convRef, { recipientRole: recipientRole });
        fallbackConversation.recipientRole = recipientRole;
      }
      return fallbackConversation;
    }
    
    // Create new conversation
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
    return { id: docRef.id, ...newConversation };
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId, senderId, text, senderName = 'User', imageUrl = null) => {
  try {
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    
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
      const unreadCount = { ...conversationData.unreadCount };
      
      // Increment unread count for other participants
      conversationData.participants.forEach(participantId => {
        if (participantId !== senderId) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
        }
      });
      
      await updateDoc(conversationRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastSenderId: senderId,
        lastSenderName: senderName,
        updatedAt: serverTimestamp(),
        unreadCount,
      });
    }
    
    return { id: docRef.id, ...newMessage };
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
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const conversations = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Get the other participant's info
      const otherUserId = data.participants.find(id => id !== userId);
      let otherUser = { name: 'Unknown User' };
      
      if (otherUserId) {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          otherUser = {
            id: otherUserId,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User',
            role: userData.role,
            avatar: userData.avatar || null,
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
 */
export const subscribeToMessages = (conversationId, callback) => {
  try {
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      }));
      callback(messages);
    }, (error) => {
      // Handle Firestore internal errors gracefully
      console.log('Messages listener error (handled):', error?.message || error);
      // Return empty array on error
      callback([]);
    });
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
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );
    
    return onSnapshot(q, async (snapshot) => {
      const conversations = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get the other participant's info
        const otherUserId = data.participants.find(id => id !== userId);
        let otherUser = { name: 'Unknown User' };
        
        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherUser = {
                id: otherUserId,
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User',
                role: userData.role,
                avatar: userData.avatar || null,
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
    }, (error) => {
      // Handle Firestore internal errors gracefully
      console.log('Conversations listener error (handled):', error?.message || error);
      // Return empty array on error
      callback([]);
    });
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
      const unreadCount = { ...data.unreadCount };
      unreadCount[userId] = 0;
      
      await updateDoc(conversationRef, { unreadCount });
    }
    
    // Also mark individual messages as read
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
    const q = query(messagesRef, where('read', '==', false));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      if (docSnap.data().senderId !== userId) {
        batch.update(docSnap.ref, { read: true });
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
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    let totalUnread = 0;
    
    snapshot.docs.forEach(doc => {
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
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalUnread += data.unreadCount?.[userId] || 0;
      });
      callback(totalUnread);
    }, (error) => {
      console.log('Unread count listener error (handled):', error?.message || error);
      callback(0);
    });
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
    
    return onSnapshot(conversationRef, (snapshot) => {
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
    }, (error) => {
      console.log('Typing status listener error (handled):', error?.message || error);
      callback(false);
    });
  } catch (error) {
    console.log('Error setting up typing status listener:', error);
    return () => {};
  }
};


/**
 * Delete a conversation for a specific user (soft delete - marks as deleted for that user)
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
      deleted[userId] = true;
      
      await updateDoc(conversationRef, { deleted });
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
      
      await updateDoc(conversationRef, { archived });
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
      
      await updateDoc(conversationRef, { archived });
    }
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    throw error;
  }
};
