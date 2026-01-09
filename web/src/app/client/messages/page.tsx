'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { MessageSquare, Archive, Trash2, RotateCcw, MoreVertical, Search, Clock, CheckCheck, Sparkles, Users, Bell } from 'lucide-react';

interface OtherUser {
  name: string;
  profilePhoto?: string;
  role?: string;
}

interface Conversation {
  id: string;
  otherUser: OtherUser | null;
  lastMessage: string;
  lastMessageTime: Date | null;
  lastSenderId: string;
  unreadCount: number;
  jobId?: string;
  archived?: Record<string, boolean>;
  deleted?: Record<string, boolean>;
}

export default function MessagesPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user?.uid) {
      console.log('[ClientMessages Web] No user.uid, setting loadingData to false');
      setLoadingData(false);
      return;
    }

    console.log('[ClientMessages Web] ========================================');
    console.log('[ClientMessages Web] User UID:', user.uid);
    console.log('[ClientMessages Web] User email:', user.email);
    console.log('[ClientMessages Web] User role:', user.role);
    console.log('[ClientMessages Web] ========================================');

    // SCAN AND FIX broken conversations first
    const scanAndFixConversations = async () => {
      try {
        console.log('[ClientMessages Web] Scanning ALL conversations to fix broken ones for user:', user.uid);
        const allConvsQuery = query(collection(db, 'conversations'));
        const { getDocs } = await import('firebase/firestore');
        const allConvsSnapshot = await getDocs(allConvsQuery);
        
        for (const docSnap of allConvsSnapshot.docs) {
          const data = docSnap.data();
          const participants = data.participants || [];
          
          // Skip if user is already in participants
          if (participants.includes(user.uid)) continue;
          
          // Check if this conversation should include this user
          let shouldFix = false;
          
          // Check unreadCount
          if (data.unreadCount && data.unreadCount[user.uid] !== undefined) {
            shouldFix = true;
          }
          
          // Check messages
          if (!shouldFix) {
            try {
              const messagesQuery = query(collection(db, 'conversations', docSnap.id, 'messages'));
              const messagesSnapshot = await getDocs(messagesQuery);
              for (const msgDoc of messagesSnapshot.docs) {
                if (msgDoc.data().senderId === user.uid) {
                  shouldFix = true;
                  break;
                }
              }
            } catch {}
          }
          
          if (shouldFix) {
            console.log('[ClientMessages Web] FIXING conversation:', docSnap.id);
            await updateDoc(doc(db, 'conversations', docSnap.id), {
              participants: [...participants, user.uid],
            });
          }
        }
      } catch (e) {
        console.error('[ClientMessages Web] Error scanning conversations:', e);
      }
    };
    
    scanAndFixConversations();

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    console.log('[ClientMessages Web] Setting up onSnapshot listener for user:', user.uid);

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      console.log('[ClientMessages Web] ========================================');
      console.log('[ClientMessages Web] onSnapshot triggered');
      console.log('[ClientMessages Web] Number of docs:', snapshot.docs.length);
      snapshot.docs.forEach((docSnap, index) => {
        const data = docSnap.data();
        console.log(`[ClientMessages Web] Conv ${index + 1}: ${docSnap.id}`);
        console.log(`[ClientMessages Web]   participants:`, data.participants);
        console.log(`[ClientMessages Web]   lastMessage:`, data.lastMessage?.substring(0, 30));
      });
      console.log('[ClientMessages Web] ========================================');
      
      const conversationPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.deleted?.[user.uid]) return null;

        const otherParticipantId = data.participants?.find((p: string) => p !== user.uid);
        let otherUser: OtherUser | null = null;
        
        if (otherParticipantId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              let userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
              if (!userName && userData.role === 'ADMIN') userName = 'GSS Support';
              if (!userName) userName = userData.email?.split('@')[0] || 'User';
              otherUser = {
                name: userName,
                profilePhoto: userData.profilePhoto || userData.photoURL,
                role: userData.role,
              };
            } else {
              otherUser = { name: 'Unknown User' };
            }
          } catch {
            otherUser = { name: 'Unknown User' };
          }
        } else {
          otherUser = { name: 'Unknown User' };
        }
        
        return {
          id: docSnap.id,
          otherUser,
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate() || data.updatedAt?.toDate() || data.createdAt?.toDate() || null,
          lastSenderId: data.lastSenderId || '',
          unreadCount: data.unreadCount?.[user.uid] || 0,
          jobId: data.jobId,
          archived: data.archived,
          deleted: data.deleted,
        } as Conversation;
      });

      const results = await Promise.all(conversationPromises);
      const allConversations = results.filter((c): c is Conversation => c !== null);
      allConversations.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      const active = allConversations.filter(c => !c.archived?.[user.uid]);
      const archived = allConversations.filter(c => c.archived?.[user.uid]);

      setConversations(active);
      setArchivedConversations(archived);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatTimestamp = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleArchive = async (conversationId: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'conversations', conversationId), { [`archived.${user.uid}`]: true });
      setMenuOpen(null);
    } catch (error) {
      console.error('Error archiving:', error);
    }
  };

  const handleUnarchive = async (conversationId: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'conversations', conversationId), { [`archived.${user.uid}`]: deleteField() });
      setMenuOpen(null);
    } catch (error) {
      console.error('Error unarchiving:', error);
    }
  };

  const handleDelete = async (conversationId: string) => {
    if (!user?.uid) return;
    if (!confirm('Delete this conversation?')) return;
    try {
      await updateDoc(doc(db, 'conversations', conversationId), { 
        [`deleted.${user.uid}`]: true,
        [`deletedAt.${user.uid}`]: serverTimestamp()
      });
      setMenuOpen(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const displayedConversations = showArchived ? archivedConversations : conversations;
  const filteredConversations = displayedConversations.filter(c =>
    c.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const getRoleBadge = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return { bg: 'bg-emerald-500', text: 'text-white', label: 'ADMIN' };
      case 'PROVIDER': return { bg: 'bg-emerald-500', text: 'text-white', label: 'PROVIDER' };
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Messages</h1>
                <p className="text-emerald-100">Chat with providers and support</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-white/80" />
                  <span className="text-2xl font-bold text-white">{conversations.length}</span>
                </div>
                <p className="text-xs text-white/70">Active Chats</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-white/80" />
                  <span className="text-2xl font-bold text-white">{totalUnread}</span>
                </div>
                <p className="text-xs text-white/70">Unread</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Archive className="w-4 h-4 text-white/80" />
                  <span className="text-2xl font-bold text-white">{archivedConversations.length}</span>
                </div>
                <p className="text-xs text-white/70">Archived</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-lg focus:ring-4 focus:ring-white/30 focus:outline-none text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-2">
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-1.5 flex mb-4">
            <button
              onClick={() => setShowArchived(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                !showArchived ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({conversations.length})
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                showArchived ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived ({archivedConversations.length})
            </button>
          </div>

          {/* Conversations List */}
          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {showArchived ? <Archive className="w-12 h-12 text-amber-400" /> : <MessageSquare className="w-12 h-12 text-emerald-400" />}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'No matches found' : showArchived ? 'No archived messages' : 'No messages yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try a different search term' : showArchived ? 'Archived conversations will appear here' : 'Start a conversation with a provider'}
              </p>
              {!showArchived && !searchQuery && (
                <button onClick={() => router.push('/client/providers')} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <Sparkles className="w-4 h-4" />
                  <span>Find Providers</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {filteredConversations.map((conversation) => {
                const roleBadge = getRoleBadge(conversation.otherUser?.role);
                return (
                  <div key={conversation.id} className={`relative group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border ${conversation.unreadCount > 0 ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white' : 'border-gray-100'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="relative cursor-pointer" onClick={() => router.push(`/chat/${conversation.id}`)}>
                        {conversation.otherUser?.profilePhoto ? (
                          <Image src={conversation.otherUser.profilePhoto} alt="" width={56} height={56} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-md" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center ring-2 ring-white shadow-md">
                            <span className="text-white text-lg font-bold">{getInitials(conversation.otherUser?.name || '')}</span>
                          </div>
                        )}
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-[10px] font-bold">{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/chat/${conversation.id}`)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{conversation.otherUser?.name || 'Unknown'}</span>
                          {roleBadge && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.bg} ${roleBadge.text}`}>{roleBadge.label}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {conversation.lastSenderId === user?.uid && <CheckCheck className={`w-4 h-4 flex-shrink-0 ${conversation.unreadCount > 0 ? 'text-gray-400' : 'text-emerald-500'}`} />}
                          <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{conversation.lastMessage || 'No messages yet'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className={conversation.unreadCount > 0 ? 'text-emerald-600 font-medium' : ''}>{formatTimestamp(conversation.lastMessageTime)}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === conversation.id ? null : conversation.id); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {menuOpen === conversation.id && (
                      <div className="absolute right-4 top-16 bg-white rounded-xl shadow-2xl border z-20 py-2 min-w-[160px]">
                        {showArchived ? (
                          <button onClick={() => handleUnarchive(conversation.id)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-emerald-600">
                            <RotateCcw className="w-4 h-4" />Restore
                          </button>
                        ) : (
                          <button onClick={() => handleArchive(conversation.id)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-amber-600">
                            <Archive className="w-4 h-4" />Archive
                          </button>
                        )}
                        <button onClick={() => handleDelete(conversation.id)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-red-600">
                          <Trash2 className="w-4 h-4" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </ClientLayout>
  );
}
