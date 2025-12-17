'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { MessageSquare, Search, Send } from 'lucide-react';

interface Message {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: Date;
}

export default function AdminMessagesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'contactMessages'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(messagesQuery);
      const list: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          senderName: data.senderName || data.name || 'Unknown',
          senderEmail: data.senderEmail || data.email || '',
          subject: data.subject || 'No Subject',
          message: data.message || '',
          status: data.status || 'unread',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setMessages(list);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredMessages = messages.filter(m =>
    m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Unread</span>;
      case 'replied':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Replied</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Read</span>;
    }
  };

  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Contact form submissions and inquiries</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
          />
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{message.senderName}</h3>
                      {getStatusBadge(message.status)}
                    </div>
                    <p className="text-sm text-gray-500">{message.senderEmail}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {message.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{message.subject}</h4>
                <p className="text-gray-600 text-sm line-clamp-2">{message.message}</p>
                <div className="mt-4 flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#00B14F] text-white rounded-lg text-sm font-medium hover:bg-[#009940]">
                    <Send className="w-4 h-4" />
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
