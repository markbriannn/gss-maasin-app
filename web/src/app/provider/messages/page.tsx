'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { MessageSquare, Search } from 'lucide-react';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function ProviderMessagesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'PROVIDER') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user?.uid) return;
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      const list: Conversation[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const otherParticipantId = data.participants?.find((p: string) => p !== user.uid);
        
        if (otherParticipantId) {
          list.push({
            id: doc.id,
            participantId: otherParticipantId,
            participantName: data.participantNames?.[otherParticipantId] || 'Client',
            participantPhoto: data.participantPhotos?.[otherParticipantId],
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
            unreadCount: data.unreadCount?.[user.uid] || 0,
          });
        }
      }
      
      list.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      setConversations(list);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading || loadingData) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
          />
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Messages from clients will appear here
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => router.push(`/provider/chat/${conversation.id}`)}
                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 ${
                  index !== filteredConversations.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                    {conversation.participantPhoto ? (
                      <img src={conversation.participantPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                        {conversation.participantName[0]}
                      </div>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#00B14F] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">{conversation.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {conversation.participantName}
                    </h3>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
