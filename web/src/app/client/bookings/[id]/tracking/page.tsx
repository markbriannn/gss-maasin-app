'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the Leaflet map component (client-side only)
const TrackingMapView = dynamic(
  () => import('@/components/TrackingMapView'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#00B14F] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    )
  }
);

export default function JobTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [job, setJob] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  // Listen to job updates
  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', jobId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setJob(data);

          // Navigate to booking details when provider marks work as done (client needs to confirm)
          if (data.status === 'pending_completion' || data.status === 'pending_payment' || data.status === 'payment_received' || data.status === 'completed') {
            router.replace(`/client/bookings/${jobId}`);
            return;
          }

          // Fetch provider info
          if (data.providerId) {
            const providerDoc = await getDoc(doc(db, 'users', data.providerId));
            if (providerDoc.exists()) {
              setProvider({ id: providerDoc.id, ...providerDoc.data() });
            }
          }
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  // Listen to provider location updates from user profile
  useEffect(() => {
    if (!job?.providerId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', job.providerId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProvider((prev: any) => ({
            ...prev,
            latitude: data.latitude,
            longitude: data.longitude,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone || data.phoneNumber,
            profilePhoto: data.profilePhoto,
          }));

          // Calculate distance if both locations available
          const clientLat = job.latitude || job.location?.latitude;
          const clientLng = job.longitude || job.location?.longitude;
          if (data.latitude && data.longitude && clientLat && clientLng) {
            const dist = calculateDistance(
              data.latitude, data.longitude,
              clientLat, clientLng
            );
            setDistance(dist.toFixed(1));
            setDuration(Math.round((dist / 30) * 60).toString());
          }
        }
      }
    );

    return () => unsubscribe();
  }, [job?.providerId, job?.latitude, job?.longitude, job?.location]);
  
  // Also listen to booking's providerLocation for fallback
  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', jobId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Use providerLocation from booking if provider's user profile doesn't have location
          if (data.providerLocation && (!provider?.latitude || !provider?.longitude)) {
            setProvider((prev: any) => ({
              ...prev,
              latitude: data.providerLocation.latitude,
              longitude: data.providerLocation.longitude,
            }));
          }
        }
      }
    );

    return () => unsubscribe();
  }, [jobId, provider?.latitude, provider?.longitude]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStatusText = () => {
    switch (job?.status) {
      case 'traveling': return 'Provider is on the way';
      case 'arrived': return 'Provider has arrived';
      case 'in_progress': return 'Work in progress';
      default: return 'Tracking provider';
    }
  };

  const getStatusColor = () => {
    switch (job?.status) {
      case 'traveling': return 'bg-blue-500';
      case 'arrived': return 'bg-green-500';
      case 'in_progress': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!job) {
    return (
      <ClientLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Job not found</p>
          <button onClick={() => router.back()} className="mt-4 text-green-600 hover:underline">
            Go Back
          </button>
        </div>
      </ClientLayout>
    );
  }

  const providerName = provider ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Provider' : 'Provider';

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`${getStatusColor()} text-white p-4 rounded-t-lg flex items-center justify-between`}>
          <div>
            <h1 className="text-xl font-semibold">Track Provider</h1>
            <p className="text-sm opacity-90">{getStatusText()}</p>
          </div>
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Interactive Map */}
        <div className="h-[400px] border-x border-gray-200">
          <TrackingMapView
            providerLocation={provider?.latitude && provider?.longitude 
              ? { lat: provider.latitude, lng: provider.longitude } 
              : null}
            clientLocation={job.latitude && job.longitude 
              ? { lat: job.latitude, lng: job.longitude } 
              : null}
            providerName={providerName}
          />
        </div>

        {/* Provider Info Card */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6">
          {/* Provider Details */}
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {provider?.profilePhoto ? (
                <img src={provider.profilePhoto} alt={providerName} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-semibold text-gray-900">{providerName}</h3>
              <div className="flex items-center mt-1">
                <span className={`w-2 h-2 rounded-full ${getStatusColor()} mr-2`}></span>
                <span className="text-sm text-gray-600">{getStatusText()}</span>
              </div>
            </div>
          </div>

          {/* ETA Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-xl font-bold text-gray-900">{distance ? `${distance} km` : '--'}</p>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
            <div className="text-center border-l border-gray-200">
              <svg className="w-6 h-6 mx-auto text-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-bold text-gray-900">{duration ? `${duration} min` : '--'}</p>
              <p className="text-xs text-gray-500">ETA</p>
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href={provider?.phone ? `tel:${provider.phone}` : '#'}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </a>
            <button
              onClick={() => router.push(`/chat/${job.id}`)}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
