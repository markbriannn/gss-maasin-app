'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';

interface JobHistory {
  id: string;
  serviceCategory: string;
  clientName: string;
  status: string;
  amount: number;
  completedAt: Date;
}

export default function HistoryPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<JobHistory[]>([]);
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
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user?.uid) return;
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(jobsQuery);
      const list: JobHistory[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (['completed', 'cancelled', 'payment_received'].includes(data.status)) {
          list.push({
            id: doc.id,
            serviceCategory: data.serviceCategory || '',
            clientName: data.clientName || 'Client',
            status: data.status,
            amount: data.finalAmount || data.providerPrice || data.totalAmount || 0,
            completedAt: data.completedAt?.toDate() || data.clientConfirmedAt?.toDate() || data.createdAt?.toDate() || new Date(),
          });
        }
      });

      setHistory(list);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'payment_received':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'payment_received': return 'Completed (Pay First)';
      case 'cancelled': return 'Cancelled';
      default: return status;
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Job History</h1>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No job history yet</p>
            <p className="text-sm text-gray-400 mt-1">Completed jobs will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {history.map((job, index) => (
              <div
                key={job.id}
                onClick={() => router.push(`/provider/job/${job.id}`)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                  index !== history.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {getStatusIcon(job.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{job.serviceCategory}</p>
                    <p className="text-sm text-gray-500">{job.clientName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {job.completedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${job.status === 'cancelled' ? 'text-gray-400' : 'text-[#00B14F]'}`}>
                    {job.status === 'cancelled' ? '-' : `₱${job.amount.toLocaleString()}`}
                  </p>
                  <p className={`text-xs ${job.status === 'cancelled' ? 'text-red-500' : 'text-green-500'}`}>
                    {getStatusText(job.status)}
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
