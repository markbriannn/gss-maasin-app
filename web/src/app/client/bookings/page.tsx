'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface Booking {
  id: string;
  serviceCategory: string;
  status: string;
  providerName?: string;
  providerId?: string;
  streetAddress?: string;
  totalAmount: number;
  createdAt: Date;
  scheduledDate?: Date;
}

export default function BookingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.uid) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user?.uid) return;
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(bookingsQuery);
      const list: Booking[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          serviceCategory: data.serviceCategory || '',
          status: data.status || '',
          providerName: data.providerName,
          providerId: data.providerId,
          streetAddress: data.streetAddress,
          totalAmount: data.totalAmount || data.price || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          scheduledDate: data.scheduledDate?.toDate(),
        });
      });
      setBookings(list);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-purple-100 text-purple-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'payment_received': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const activeBookings = bookings.filter(b => 
    !['completed', 'cancelled'].includes(b.status)
  );
  const completedBookings = bookings.filter(b => 
    ['completed', 'cancelled'].includes(b.status)
  );

  const displayedBookings = activeTab === 'active' ? activeBookings : completedBookings;

  if (isLoading || loadingData) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-[#00B14F] border-b-2 border-[#00B14F]'
                : 'text-gray-500'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'completed'
                ? 'text-[#00B14F] border-b-2 border-[#00B14F]'
                : 'text-gray-500'
            }`}
          >
            Completed ({completedBookings.length})
          </button>
        </div>

        {/* Bookings List */}
        {displayedBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No {activeTab} bookings</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => router.push(`/client/booking/${booking.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{booking.serviceCategory}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {formatStatus(booking.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {booking.providerName || 'Finding provider...'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {booking.streetAddress && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{booking.streetAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{booking.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-[#00B14F]">₱{booking.totalAmount.toLocaleString()}</p>
                    <ChevronRight className="w-5 h-5 text-gray-400 mt-2 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
