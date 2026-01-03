'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  collection, doc, onSnapshot, addDoc, updateDoc, getDoc, 
  query, orderBy, serverTimestamp, where, getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Send, User, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { uploadImage } from '@/lib/cloudinary';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  imageUrl?: string;
  createdAt: Date;
  read: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            const otherUserId = convData.participants?.find((p: string) => p !== user.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setRecipient({
                  id: otherUserId,
                  name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User',
                  photo: userData.profilePhoto,
                  role: userData.role,
                });
              }
            }
          }
          setLoading(false);
          return;
        }

        // If we have a recipient ID, find or create conversation
        if (recipientId) {
          // Fetch recipient info
          const recipientDoc = await getDoc(doc(db, 'users', recipientId));
          if (recipientDoc.exists()) {
            const recipientData = recipientDoc.data();
            setRecipient({
              id: recipientId,
              name: `${recipientData.firstName || ''} ${recipientData.lastName || ''}`.trim() || 'User',
              photo: recipientData.profilePhoto,
              role: recipientData.role,
            });
          }

          // Check for existing conversation
          const convQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid)
          );
          const convSnapshot = await getDocs(convQuery);
          
          let existingConvId: string | null = null;
          convSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.participants?.includes(recipientId)) {
              existingConvId = doc.id;
            }
          });

          if (existingConvId) {
            setConversationId(existingConvId);
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

    // Immediately reset unread count when opening the chat
    updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadCount.${user.uid}`]: 0,
    }).catch(() => {});

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          text: data.text || '',
          senderId: data.senderId,
          senderName: data.senderName || 'User',
          imageUrl: data.imageUrl,
          createdAt: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
          read: data.read || false,
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
      if (!convId && recipientId) {
        const convRef = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, recipientId],
          createdAt: serverTimestamp(),
          lastMessage: imageUrl ? '📷 Image' : messageText,
          lastMessageAt: serverTimestamp(),
          jobId: jobId || null,
        });
        convId = convRef.id;
        setConversationId(convId);
      }

      if (!convId) {
        throw new Error('No conversation ID');
      }

      // Add message
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
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

      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: imageUrl ? '📷 Image' : messageText,
        lastMessageTime: serverTimestamp(),
        lastSenderId: user.uid,
        updatedAt: serverTimestamp(),
        unreadCount,
      });
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
              <p className="text-xs text-gray-500 capitalize">{recipient.role.toLowerCase()}</p>
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
              {msgs.map((message) => {
                const isOwn = message.senderId === user?.uid;
                return (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-[#00B14F] text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                      }`}
                    >
                      {message.imageUrl && (
                        <img
                          src={message.imageUrl}
                          alt=""
                          className="max-w-full rounded-lg mb-2"
                        />
                      )}
                      {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? 'text-green-100' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
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
            onChange={(e) => setNewMessage(e.target.value)}
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
