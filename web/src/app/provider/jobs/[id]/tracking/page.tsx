"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProviderLayout from "@/components/layouts/ProviderLayout";
import { db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the Leaflet map component (client-side only)
const DirectionsMapView = dynamic(
  () => import("@/components/DirectionsMapView"),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-48 w-full bg-gray-100 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#00B14F] animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    )
  }
);

interface JobData {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  serviceCategory?: string;
  status: string;
  address: string;
  // Client location can be stored in different ways
  location?: {
    latitude: number;
    longitude: number;
  };
  latitude?: number;
  longitude?: number;
  scheduledDate: Date;
  providerLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function ProviderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", jobId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJob({
          id: docSnap.id,
          ...data,
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
        } as JobData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  // Get current location and update both booking and user profile
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Update provider location in booking document
          if (jobId) {
            updateDoc(doc(db, "bookings", jobId), {
              providerLocation: {
                latitude: newLocation.lat,
                longitude: newLocation.lng,
              },
              providerLocationUpdatedAt: new Date(),
            }).catch(console.error);
          }
          
          // Also update provider's user profile for real-time tracking
          if (user?.uid) {
            updateDoc(doc(db, "users", user.uid), {
              latitude: newLocation.lat,
              longitude: newLocation.lng,
              locationUpdatedAt: new Date(),
              isOnline: true,
            }).catch(console.error);
          }
        },
        (error) => {
          // Handle geolocation errors gracefully
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          console.warn('Geolocation error:', errorMessage);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      console.warn('Geolocation is not supported by this browser');
    }
  }, [jobId, user]);

  const updateStatus = async (newStatus: string) => {
    if (!job) return;
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "arrived") {
        updateData.arrivedAt = new Date();
      } else if (newStatus === "in_progress") {
        updateData.startedAt = new Date();
      }

      await updateDoc(doc(db, "bookings", jobId), updateData);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const openDirections = () => {
    const lat = job?.location?.latitude || job?.latitude;
    const lng = job?.location?.longitude || job?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, "_blank");
    } else {
      alert("Client location not available");
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: "accepted", label: "Accepted", icon: "✓" },
      { key: "traveling", label: "On the Way", icon: "🚗" },
      { key: "arrived", label: "Arrived", icon: "📍" },
      { key: "in_progress", label: "In Progress", icon: "🔧" },
    ];

    const currentIndex = steps.findIndex((s) => s.key === job?.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  if (!job) {
    return (
      <ProviderLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-gray-500 text-lg">Job not found</p>
          <button
            onClick={() => router.push("/provider/jobs")}
            className="mt-4 text-green-500 hover:underline"
          >
            Back to Jobs
          </button>
        </div>
      </ProviderLayout>
    );
  }

  const steps = getStatusSteps();

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Job Tracking</h1>
        </div>

        {/* Status Progress */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Progress</h2>
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    step.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step.icon}
                </div>
                <p
                  className={`text-xs mt-2 text-center ${
                    step.current ? "font-bold text-green-600" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute h-1 w-full top-5 left-1/2 ${
                      step.completed ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Client Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{job.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <a href={`tel:${job.clientPhone}`} className="font-medium text-green-600">
                {job.clientPhone}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium">{job.serviceType || job.serviceCategory}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Client Location</h2>
          <p className="text-gray-700 mb-4">{job.address}</p>
          
          {/* Interactive Map - handle both location formats */}
          {(job.location || (job.latitude && job.longitude)) && (
            <div className="rounded-lg h-48 overflow-hidden mb-4">
              <DirectionsMapView
                destination={{ 
                  lat: job.location?.latitude || job.latitude || 0, 
                  lng: job.location?.longitude || job.longitude || 0 
                }}
                currentLocation={currentLocation}
                destinationLabel={job.address}
              />
            </div>
          )}

          <button
            onClick={openDirections}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            🗺️ Open in Google Maps
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {job.status === "accepted" && (
            <button
              onClick={() => updateStatus("traveling")}
              disabled={updating}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {updating ? "Updating..." : "🚗 Start Traveling"}
            </button>
          )}

          {job.status === "traveling" && (
            <button
              onClick={() => updateStatus("arrived")}
              disabled={updating}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {updating ? "Updating..." : "📍 I Have Arrived"}
            </button>
          )}

          {job.status === "arrived" && (
            <button
              onClick={() => updateStatus("in_progress")}
              disabled={updating}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {updating ? "Updating..." : "🔧 Start Working"}
            </button>
          )}

          {job.status === "in_progress" && (
            <button
              onClick={() => router.push(`/provider/jobs/${jobId}`)}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600"
            >
              📋 Go to Job Details
            </button>
          )}

          <button
            onClick={() => router.push(`/chat/new?recipientId=${job.clientId}&jobId=${jobId}`)}
            className="w-full border border-green-500 text-green-500 py-3 rounded-lg hover:bg-green-50"
          >
            💬 Message Client
          </button>
        </div>
      </div>
    </ProviderLayout>
  );
}
