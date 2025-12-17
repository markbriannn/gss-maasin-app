'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Car,
  Home,
  ChevronRight
} from 'lucide-react';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  rating: number;
  reviewCount: number;
  profilePhoto?: string;
  isOnline: boolean;
}

interface Booking {
  id: string;
  serviceCategory: string;
  status: string;
  providerName?: string;
  createdAt: Date;
}

const serviceCategories = [
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#8B5CF6' },
  { id: 'painter', name: 'Painter', icon: Paintbrush, color: '#EF4444' },
  { id: 'mechanic', name: 'Mechanic', icon: Car, color: '#10B981' },
  { id: 'cleaner', name: 'Cleaner', icon: Home, color: '#EC4899' },
];

export default function ClientDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch top providers
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('providerStatus', '==', 'approved'),
        limit(6)
      );
      const providersSnapshot = await getDocs(providersQuery);
      const providersList: Provider[] = [];
      providersSnapshot.forEach((doc) => {
        const data = doc.data();
        providersList.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          profilePhoto: data.profilePhoto,
          isOnline: data.isOnline || false,
        });
      });
      setProviders(providersList);

      // Fetch recent bookings
      if (user?.uid) {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsList: Booking[] = [];
        bookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          bookingsList.push({
            id: doc.id,
            serviceCategory: data.serviceCategory || '',
            status: data.status || '',
            providerName: data.providerName,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setRecentBookings(bookingsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">What service do you need today?</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for services or providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] focus:border-transparent"
            />
          </div>
        </div>

        {/* Service Categories */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {serviceCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => router.push(`/client/providers?category=${category.id}`)}
                className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <category.icon className="w-6 h-6" style={{ color: category.color }} />
                </div>
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <button 
                onClick={() => router.push('/client/bookings')}
                className="text-[#00B14F] text-sm font-medium flex items-center gap-1 hover:underline"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {recentBookings.map((booking, index) => (
                <div 
                  key={booking.id}
                  className={`p-4 flex items-center justify-between ${index !== recentBookings.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.serviceCategory}</p>
                      <p className="text-sm text-gray-500">
                        {booking.providerName || 'Finding provider...'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Providers */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Providers</h2>
            <button 
              onClick={() => router.push('/client/providers')}
              className="text-[#00B14F] text-sm font-medium flex items-center gap-1 hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div 
                key={provider.id}
                onClick={() => router.push(`/client/provider/${provider.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden">
                      {provider.profilePhoto ? (
                        <img 
                          src={provider.profilePhoto} 
                          alt={provider.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-semibold">
                          {provider.firstName[0]}
                        </div>
                      )}
                    </div>
                    {provider.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {provider.firstName} {provider.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{provider.serviceCategory}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-400">({provider.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
