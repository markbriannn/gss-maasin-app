'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  collection, doc, onSnapshot, addDoc, updateDoc, getDoc, 
  query, orderBy, serverTimestamp, where, getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Send, User, Loader2, Image as ImageIcon, X, Check, CheckCheck, Smile } from 'lucide-react';
import { uploadImage } from '@/lib/cloudinary';
import { pushNotifications } from '@/lib/pushNotifications';

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  imageUrl?: string;
  createdAt: Date;
  read: boolean;
  reactions?: Reaction[];
}

interface Recipient {
  id: string;
  name: string;
  photo?: string;
  role?: string;
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const conversationIdParam = params.conversationId as string;
  const recipientId = searchParams.get('recipientId');
  const jobId = searchParams.get('jobId');

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    conversationIdParam !== 'new' ? conversationIdParam : null
  );
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const resolvedRecipientIdRef = useRef<string | null>(null); // Store resolved recipient ID
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing indicator
  const handleTextChange = useCallback((text: string) => {
    setNewMessage(text);
    
    if (!conversationId || !user?.uid) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing status - update timestamp on every keystroke for better sync
    if (text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
      }
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${user.uid}`]: true,
        [`typingTimestamp.${user.uid}`]: serverTimestamp(),
      }).catch(() => {});
    }
    
    // Clear typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (conversationId && user?.uid) {
        updateDoc(doc(db, 'conversations', conversationId), {
          [`typing.${user.uid}`]: false,
        }).catch(() => {});
      }
    }, 2000);
  }, [conversationId, user?.uid, isTyping]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (conversationId && user?.uid) {
        updateDoc(doc(db, 'conversations', conversationId), {
          [`typing.${user.uid}`]: false,
        }).catch(() => {});
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user?.uid]);

  // Subscribe to typing status
  useEffect(() => {
    if (!conversationId || !user?.uid) return;
    
    const unsubscribe = onSnapshot(doc(db, 'conversations', conversationId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const typing = data.typing || {};
        
        // Check if any other user is typing
        let otherTyping = false;
        for (const [userId, isUserTyping] of Object.entries(typing)) {
          if (userId !== user.uid && isUserTyping) {
            const typingTimestamp = data.typingTimestamp?.[userId];
            if (typingTimestamp) {
              const timestampDate = typingTimestamp.toDate?.() || new Date(typingTimestamp);
              const now = new Date();
              const diffSeconds = (now.getTime() - timestampDate.getTime()) / 1000;
              // Be more lenient - 10 seconds instead of 5, and also accept if timestamp is in the future (clock sync issues)
              if (diffSeconds < 10 || diffSeconds < 0) {
                otherTyping = true;
              }
            } else {
              // No timestamp but typing is true - show indicator
              otherTyping = true;
            }
          }
        }
        setOtherUserTyping(otherTyping);
      }
    });
    
    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  // Add reaction to message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!conversationId || !user?.uid) return;
    
    try {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (messageSnap.exists()) {
        const data = messageSnap.data();
        let reactions: Reaction[] = data.reactions || [];
        
        // Check if user already reacted with this emoji
        const existingIndex = reactions.findIndex(
          r => r.userId === user.uid && r.emoji === emoji
        );
        
        if (existingIndex >= 0) {
          // Remove reaction if same emoji clicked
          reactions = reactions.filter((_, i) => i !== existingIndex);
        } else {
          // Remove any existing reaction from this user and add new one
          reactions = reactions.filter(r => r.userId !== user.uid);
          
          // Get user name for reaction
          let reactionUserName = 'User';
          const isAdmin = user.role?.toUpperCase() === 'ADMIN';
          if (isAdmin) {
            reactionUserName = 'GSS Support';
          } else {
            const contextName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (contextName) {
              reactionUserName = contextName;
            } else {
              // Fetch from Firestore
              try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  reactionUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'User';
                }
              } catch {
                reactionUserName = user.email?.split('@')[0] || 'User';
              }
            }
          }
          
          reactions.push({
            emoji,
            userId: user.uid,
            userName: reactionUserName,
          });
        }
        
        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
    
    setShowReactionPicker(null);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch or create conversation
  useEffect(() => {
    if (!user) return;

    const initConversation = async () => {
      try {
        // If we have a conversation ID, use it
        if (conversationIdParam && conversationIdParam !== 'new') {
          setConversationId(conversationIdParam);
          
          // Get conversation to find recipient
          const convDoc = await getDoc(doc(db, 'conversations', conversationIdParam));
          if (convDoc.exists()) {
            const convData = convDoc.data();
            let participants = convData.participants || [];
            
            console.log('[Chat] Existing conversation participants:', participants);
            
            // FIX: If current user is not in participants, add them (fixes broken conversations)
            if (!participants.includes(user.uid)) {
              console.log('[Chat] FIXING broken conversation - adding current user to participants');
              participants = [...participants, user.uid];
              await updateDoc(doc(db, 'conversations', conversationIdParam), {
                participants: participants,
                [`unreadCount.${user.uid}`]: 0,
              });
            }
            
            // Find the other user - first try from participants
            let otherUserId = participants.find((p: string) => p !== user.uid);
            
            // If no other user found in participants, check messages to find who else is involved
            if (!otherUserId) {
              console.log('[Chat] No other user in participants, checking messages...');
              const messagesQuery = query(
                collection(db, 'conversations', conversationIdParam, 'messages'),
                orderBy('timestamp', 'desc')
              );
              const messagesSnapshot = await getDocs(messagesQuery);
              
              for (const msgDoc of messagesSnapshot.docs) {
                const msgData = msgDoc.data();
                if (msgData.senderId && msgData.senderId !== user.uid) {
                  otherUserId = msgData.senderId;
                  console.log('[Chat] Found other user from messages:', otherUserId);
                  // FIX: Add this user to participants
                  participants = [...participants, otherUserId];
                  await updateDoc(doc(db, 'conversations', conversationIdParam), {
                    participants: participants,
                  });
                  break;
                }
              }
              
              // Also check unreadCount keys
              if (!otherUserId && convData.unreadCount) {
                const unreadKeys = Object.keys(convData.unreadCount);
                otherUserId = unreadKeys.find(k => k !== user.uid);
                if (otherUserId) {
                  console.log('[Chat] Found other user from unreadCount:', otherUserId);
                  // FIX: Add this user to participants
                  if (!participants.includes(otherUserId)) {
                    participants = [...participants, otherUserId];
                    await updateDoc(doc(db, 'conversations', conversationIdParam), {
                      participants: participants,
                    });
                  }
                }
              }
            }
            
            if (otherUserId) {
              resolvedRecipientIdRef.current = otherUserId;
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const isAdmin = userData.role?.toUpperCase() === 'ADMIN';
                setRecipient({
                  id: otherUserId,
                  name: isAdmin ? 'GSS Support' : (`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || 'User'),
                  photo: userData.profilePhoto,
                  role: isAdmin ? 'Support Team' : userData.role,
                });
              } else {
                setRecipient({
                  id: otherUserId,
                  name: 'User',
                  role: 'CLIENT',
                });
              }
            }
          }
          setLoading(false);
          return;
        }

        // If we have a recipient ID, find or create conversation
        if (recipientId) {
          let actualRecipientId = recipientId;
          
          // Handle special case: "admin" means find an actual admin user
          if (recipientId === 'admin') {
            try {
              const adminsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'ADMIN')
              );
              const adminsSnapshot = await getDocs(adminsQuery);
              if (!adminsSnapshot.empty) {
                actualRecipientId = adminsSnapshot.docs[0].id;
                console.log('[Chat] Found admin user:', actualRecipientId);
              } else {
                console.error('[Chat] No admin users found');
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error('[Chat] Error finding admin:', e);
              setLoading(false);
              return;
            }
          }
          
          // Fetch recipient info
          const recipientDoc = await getDoc(doc(db, 'users', actualRecipientId));
          if (recipientDoc.exists()) {
            const recipientData = recipientDoc.data();
            const isAdmin = recipientData.role?.toUpperCase() === 'ADMIN';
            resolvedRecipientIdRef.current = actualRecipientId; // Store in ref
            setRecipient({
              id: actualRecipientId,
              name: isAdmin ? 'GSS Support' : (`${recipientData.firstName || ''} ${recipientData.lastName || ''}`.trim() || recipientData.displayName || 'User'),
              photo: recipientData.profilePhoto,
              role: isAdmin ? 'Support Team' : recipientData.role,
            });
          } else {
            // User not found, but still store the ID
            resolvedRecipientIdRef.current = actualRecipientId;
            setRecipient({
              id: actualRecipientId,
              name: 'User',
              role: 'CLIENT',
            });
          }

          // Check for existing conversation
          const convQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid)
          );
          const convSnapshot = await getDocs(convQuery);
          
          let existingConvId: string | null = null;
          let fallbackConvId: string | null = null;
          
          console.log('[Chat] Current user ID:', user.uid);
          console.log('[Chat] Looking for existing conversation with recipient:', actualRecipientId, 'jobId:', jobId);
          console.log('[Chat] Found', convSnapshot.docs.length, 'conversations for user');
          
          convSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // IMPORTANT: Verify BOTH participants are in the array to ensure conversation is valid
            const hasCurrentUser = data.participants?.includes(user.uid);
            const hasRecipient = data.participants?.includes(actualRecipientId);
            
            console.log('[Chat] Checking conversation:', docSnap.id, {
              participants: data.participants,
              hasCurrentUser,
              hasRecipient,
              jobId: data.jobId
            });
            
            if (hasCurrentUser && hasRecipient) {
              console.log('[Chat] Found valid conversation:', docSnap.id);
              // Priority 1: Match by jobId if specified
              if (jobId && data.jobId === jobId) {
                console.log('[Chat] Exact jobId match found:', docSnap.id);
                existingConvId = docSnap.id;
                return;
              }
              // Priority 2: Any conversation between these users (fallback)
              if (!fallbackConvId) {
                fallbackConvId = docSnap.id;
              }
            } else {
              console.log('[Chat] Skipping invalid conversation:', docSnap.id, '- missing participant');
            }
          });

          // Use exact match if found, otherwise use fallback
          if (existingConvId) {
            console.log('[Chat] Using exact match conversation:', existingConvId);
            setConversationId(existingConvId);
          } else if (fallbackConvId) {
            console.log('[Chat] Using fallback conversation:', fallbackConvId);
            setConversationId(fallbackConvId);
          } else {
            console.log('[Chat] No existing conversation found, will create new one');
          }
          // If no existing conversation, we'll create one when first message is sent
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setLoading(false);
      }
    };

    initConversation();
  }, [user, conversationIdParam, recipientId]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId || !user?.uid) return;

    // First get the conversation to check deletedAt timestamp
    const getDeletedAt = async () => {
      try {
        const convDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (convDoc.exists()) {
          const convData = convDoc.data();
          return convData.deletedAt?.[user.uid]?.toDate?.() || null;
        }
      } catch {
        return null;
      }
      return null;
    };

    // Immediately reset unread count when opening the chat
    updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCount.${user.uid}`]: 0,
    }).catch(() => {});

    let userDeletedAt: Date | null = null;
    
    getDeletedAt().then((deletedAt) => {
      userDeletedAt = deletedAt;
    });

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      // Re-fetch deletedAt in case it changed
      const convDoc = await getDoc(doc(db, 'conversations', conversationId));
      const convData = convDoc.data();
      userDeletedAt = convData?.deletedAt?.[user.uid]?.toDate?.() || null;
      
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const msgTime = data.timestamp?.toDate() || data.createdAt?.toDate() || new Date();
        
        // Filter out messages that were sent before user deleted the conversation
        // Only show messages sent AFTER the user deleted (if they deleted)
        if (userDeletedAt && msgTime < userDeletedAt) {
          return; // Skip this message - it's from before user deleted
        }
        
        msgs.push({
          id: docSnap.id,
          text: data.text || '',
          senderId: data.senderId,
          senderName: data.senderName || 'User',
          imageUrl: data.imageUrl,
          createdAt: msgTime,
          read: data.read || false,
          reactions: data.reactions || [],
        });
      });
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);

      // Mark individual messages as read
      msgs.forEach((msg) => {
        if (msg.senderId !== user?.uid && !msg.read) {
          updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), {
            read: true,
          }).catch(() => {});
        }
      });
    });

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !user || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Clear typing status immediately
    setIsTyping(false);
    if (conversationId && user?.uid) {
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${user.uid}`]: false,
      }).catch(() => {});
    }

    try {
      let convId = conversationId;
      let imageUrl: string | null = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          const result = await uploadImage(selectedImage, 'chat');
          imageUrl = result.url;
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          alert('Failed to upload image. Please try again.');
          setSending(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
        clearSelectedImage();
      }

      // Create conversation if it doesn't exist
      if (!convId) {
        const actualRecipientId = recipient?.id || resolvedRecipientIdRef.current;
        if (!actualRecipientId) {
          console.error('[Chat] No recipient ID available - recipient:', recipient, 'ref:', resolvedRecipientIdRef.current);
          throw new Error('No recipient ID');
        }
        console.log('[Chat] Creating new conversation:');
        console.log('[Chat] - Current user (sender):', user.uid);
        console.log('[Chat] - Recipient ID:', actualRecipientId);
        console.log('[Chat] - Job ID:', jobId);
        console.log('[Chat] - Participants array will be:', [user.uid, actualRecipientId]);
        
        // CRITICAL: Ensure both IDs are valid strings
        if (typeof user.uid !== 'string' || typeof actualRecipientId !== 'string') {
          console.error('[Chat] Invalid user IDs:', { senderType: typeof user.uid, recipientType: typeof actualRecipientId });
          throw new Error('Invalid user IDs');
        }
        
        const participantsArray = [user.uid, actualRecipientId];
        console.log('[Chat] Final participants array:', participantsArray);
        
        const convRef = await addDoc(collection(db, 'conversations'), {
          participants: participantsArray,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: imageUrl ? '📷 Image' : messageText,
          lastMessageTime: serverTimestamp(),
          lastSenderId: user.uid,
          jobId: jobId || null,
          unreadCount: {
            [user.uid]: 0,
            [actualRecipientId]: 1, // Recipient has 1 unread message
          },
        });
        convId = convRef.id;
        console.log('[Chat] Created new conversation with ID:', convId);
        
        // VERIFY the conversation was created correctly
        const verifyDoc = await getDoc(doc(db, 'conversations', convId));
        if (verifyDoc.exists()) {
          const verifyData = verifyDoc.data();
          console.log('[Chat] VERIFICATION - Saved participants:', verifyData.participants);
          if (!verifyData.participants?.includes(actualRecipientId)) {
            console.error('[Chat] CRITICAL: Recipient not in participants! Fixing...');
            await updateDoc(doc(db, 'conversations', convId), {
              participants: [user.uid, actualRecipientId],
            });
          }
        }
        
        setConversationId(convId);
      } else {
        // EXISTING conversation - verify recipient is in participants
        const actualRecipientId = recipient?.id || resolvedRecipientIdRef.current;
        if (actualRecipientId) {
          const convDoc = await getDoc(doc(db, 'conversations', convId));
          if (convDoc.exists()) {
            const convData = convDoc.data();
            const participants = convData.participants || [];
            if (!participants.includes(actualRecipientId)) {
              console.log('[Chat] FIXING existing conversation - adding recipient to participants');
              await updateDoc(doc(db, 'conversations', convId), {
                participants: [...participants, actualRecipientId],
              });
            }
          }
        }
      }

      if (!convId) {
        throw new Error('No conversation ID');
      }

      // Get sender name - ALWAYS fetch from Firestore to ensure we have the correct name
      let senderName = 'User';
      const isAdmin = user.role?.toUpperCase() === 'ADMIN';
      
      if (isAdmin) {
        senderName = 'GSS Support';
      } else {
        // Always fetch from Firestore to get the most accurate name
        console.log('[Chat] Fetching name from Firestore for user:', user.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('[Chat] Firestore user data:', userData.firstName, userData.lastName, userData.email);
            const firestoreName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            senderName = firestoreName || userData.email?.split('@')[0] || user.email?.split('@')[0] || 'User';
          } else {
            console.log('[Chat] User doc does not exist, using context');
            const contextName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            senderName = contextName || user.email?.split('@')[0] || 'User';
          }
        } catch (e) {
          console.error('[Chat] Error fetching user name:', e);
          // Fallback to context
          const contextName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          senderName = contextName || user.email?.split('@')[0] || 'User';
        }
      }
      
      console.log('[Chat] Final senderName:', senderName);
      
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: senderName,
        imageUrl: imageUrl || null,
        timestamp: serverTimestamp(),
        read: false,
      });

      // Update conversation last message and unread count
      const convDoc = await getDoc(doc(db, 'conversations', convId));
      const convData = convDoc.data();
      const unreadCount: Record<string, number> = convData?.unreadCount ? { ...convData.unreadCount } : {};
      
      // Increment unread count for other participants
      convData?.participants?.forEach((participantId: string) => {
        if (participantId !== user.uid) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
        }
      });

      // Build update object - clear deleted flag for recipients so conversation reappears in their inbox
      const updateData: Record<string, unknown> = {
        lastMessage: imageUrl ? '📷 Image' : messageText,
        lastMessageTime: serverTimestamp(),
        lastSenderId: user.uid,
        updatedAt: serverTimestamp(),
        unreadCount,
      };
      
      // Clear deleted flag for all other participants (so conversation shows in their inbox again)
      convData?.participants?.forEach((participantId: string) => {
        if (participantId !== user.uid) {
          updateData[`deleted.${participantId}`] = false;
        }
      });

      await updateDoc(doc(db, 'conversations', convId), updateData);

      // Send FCM push notification to recipient
      const notifyRecipientId = recipient?.id || resolvedRecipientIdRef.current;
      if (notifyRecipientId && notifyRecipientId !== user.uid) {
        const messagePreview = imageUrl ? '📷 Image' : messageText;
        pushNotifications.newMessageToUser(notifyRecipientId, senderName, messagePreview, convId, user.uid);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = formatDate(message.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  const backUrl = user?.role?.toUpperCase() === 'PROVIDER' 
    ? '/provider/messages' 
    : user?.role?.toUpperCase() === 'ADMIN'
    ? '/admin/messages'
    : '/client/messages';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={backUrl} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {recipient?.photo ? (
            <img src={recipient.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{recipient?.name || 'Chat'}</p>
            {recipient?.role && (
              <p className="text-xs text-gray-500 capitalize">
                {recipient.role === 'Support Team' ? 'Support Team' : recipient.role.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex justify-center my-4">
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              {msgs.map((message, index) => {
                const isOwn = message.senderId === user?.uid;
                const isLastOwnMessage = isOwn && index === msgs.length - 1;
                const showReadReceipt = isOwn;
                return (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="relative">
                      {/* Reaction picker */}
                      {showReactionPicker === message.id && (
                        <div className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1 flex gap-1 z-10`}>
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] min-w-[80px] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-[#00B14F] text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                        }`}
                      >
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt=""
                            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(message.imageUrl, '_blank')}
                          />
                        )}
                        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-green-100' : 'text-gray-400'}`}>
                          <span className="text-xs">{formatTime(message.createdAt)}</span>
                          {/* Read receipts for own messages */}
                          {showReadReceipt && (
                            message.read ? (
                              <CheckCheck className="w-4 h-4 text-blue-300" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                      
                      {/* Reactions display */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className={`flex gap-0.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(
                            message.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm flex items-center gap-0.5"
                              title={message.reactions?.filter(r => r.emoji === emoji).map(r => r.userName).join(', ')}
                            >
                              {emoji}
                              {count > 1 && <span className="text-gray-500">{count}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Reaction button (shows on hover) */}
                      <button
                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                        className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full`}
                      >
                        <Smile className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {/* Read text for last own message */}
                      {isLastOwnMessage && message.read && (
                        <p className={`text-xs text-emerald-500 mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                          Read
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {otherUserTyping && (
            <div className="flex justify-start mb-3">
              <div className="bg-white rounded-2xl rounded-bl-md shadow-sm px-4 py-3 flex items-center gap-2">
                <span className="text-sm text-gray-500">{recipient?.name?.split(' ')[0] || 'User'} is typing</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t sticky bottom-0">
        {/* Image Preview */}
        {imagePreview && (
          <div className="max-w-2xl mx-auto px-4 pt-3">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={clearSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingImage}
            className="p-2.5 text-gray-500 hover:text-[#00B14F] hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Send image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-[#00B14F]/20"
          />
          <button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sending}
            className="p-2.5 bg-[#00B14F] text-white rounded-full disabled:opacity-50 hover:bg-[#009940] transition-colors"
          >
            {sending || uploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
