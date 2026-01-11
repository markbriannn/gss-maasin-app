"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProviderLayout from "@/components/layouts/ProviderLayout";
import { db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import { 
  Loader2, ArrowLeft, Phone, MessageCircle, Navigation, MapPin, 
  CheckCircle, Car, Wrench, User, ChevronRight, Zap,
  Shield, Star, ExternalLink, Copy, Check
} from "lucide-react";
import { pushNotifications } from "@/lib/pushNotifications";

// Optimization constants - reduce Firestore writes to save quota
const FIRESTORE_UPDATE_INTERVAL = 15000; // Only write to Firestore every 15 seconds
const MIN_DISTANCE_FOR_UPDATE = 0.02; // Only update if moved at least 20 meters (0.02 km)

// Dynamically import the Leaflet map component (client-side only)
const DirectionsMapView = dynamic(
  () => import("@/components/DirectionsMapView"),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-64 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 text-sm font-medium">Loading live map...</p>
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
  totalAmount?: number;
  providerPrice?: number;
  location?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  scheduledDate: Date;
  providerLocation?: { latitude: number; longitude: number };
  travelingAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
}

interface ClientInfo {
  photo?: string;
  rating?: number;
  completedBookings?: number;
}

const STATUS_STEPS = [
  { key: "accepted", label: "Accepted", icon: CheckCircle, color: "emerald", emoji: "✓" },
  { key: "traveling", label: "On the Way", icon: Car, color: "blue", emoji: "🚗" },
  { key: "arrived", label: "Arrived", icon: MapPin, color: "violet", emoji: "📍" },
  { key: "in_progress", label: "Working", icon: Wrench, color: "amber", emoji: "🔧" },
];

export default function ProviderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  
  // Refs for throttling Firestore writes
  const lastFirestoreUpdate = useRef<number>(0);
  const lastWrittenLocation = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", jobId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJob({
          id: docSnap.id,
          ...data,
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
        } as JobData);

        // Fetch client info
        if (data.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, "users", data.clientId));
            if (clientDoc.exists()) {
              const cData = clientDoc.data();
              setClientInfo({
                photo: cData.profilePhoto,
                rating: cData.rating || cData.averageRating,
                completedBookings: cData.completedBookings || cData.bookingsCompleted || 0,
              });
            }
          } catch (e) {}
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  // Get current location and update (with throttling to save Firestore quota)
  useEffect(() => {
    if (navigator.geolocation) {
      // Helper function to check if we should write to Firestore
      const shouldWriteToFirestore = (newLoc: { lat: number; lng: number }) => {
        const now = Date.now();
        const timeSinceLastWrite = now - lastFirestoreUpdate.current;
        
        // Always write if enough time has passed
        if (timeSinceLastWrite >= FIRESTORE_UPDATE_INTERVAL) {
          return true;
        }
        
        // Also write if moved significantly (even if time hasn't passed)
        if (lastWrittenLocation.current) {
          const distanceMoved = calculateDistance(
            lastWrittenLocation.current.lat,
            lastWrittenLocation.current.lng,
            newLoc.lat,
            newLoc.lng
          );
          
          if (distanceMoved >= MIN_DISTANCE_FOR_UPDATE && timeSinceLastWrite >= 5000) {
            return true;
          }
        }
        
        return false;
      };

      // Helper function to write location to Firestore
      const writeLocationToFirestore = async (newLoc: { lat: number; lng: number }) => {
        try {
          if (jobId) {
            updateDoc(doc(db, "bookings", jobId), {
              providerLocation: { latitude: newLoc.lat, longitude: newLoc.lng },
              providerLocationUpdatedAt: new Date(),
            }).catch(console.error);
          }
          
          if (user?.uid) {
            updateDoc(doc(db, "users", user.uid), {
              latitude: newLoc.lat,
              longitude: newLoc.lng,
              locationUpdatedAt: new Date(),
              isOnline: true,
            }).catch(console.error);
          }
          
          lastFirestoreUpdate.current = Date.now();
          lastWrittenLocation.current = newLoc;
        } catch (e) {
          console.error("Error writing location:", e);
        }
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          // Always update local state (no Firestore cost - keeps map smooth)
          setCurrentLocation(newLocation);

          // Calculate ETA (local calculation - no Firestore cost)
          const clientLat = job?.location?.latitude || job?.latitude;
          const clientLng = job?.location?.longitude || job?.longitude;
          if (clientLat && clientLng) {
            const dist = calculateDistance(newLocation.lat, newLocation.lng, clientLat, clientLng);
            setDistance(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`);
            const etaMinutes = Math.round((dist / 30) * 60); // Assuming 30km/h average
            setEta(etaMinutes < 1 ? "< 1 min" : `${etaMinutes} min`);
          }
          
          // Only write to Firestore if throttle conditions are met (saves quota!)
          if (shouldWriteToFirestore(newLocation)) {
            writeLocationToFirestore(newLocation);
          }
        },
        (error) => console.warn('Geolocation error:', error.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [jobId, user, job]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const updateStatus = async (newStatus: string) => {
    if (!job) return;
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
      
      if (newStatus === "traveling") updateData.travelingAt = new Date();
      else if (newStatus === "arrived") updateData.arrivedAt = new Date();
      else if (newStatus === "in_progress") updateData.startedAt = new Date();

      await updateDoc(doc(db, "bookings", jobId), updateData);

      // Also update provider's user document for admin live map tracking
      if (user?.uid) {
        const userUpdateData: Record<string, unknown> = {
          currentJobId: jobId,
          jobStatus: newStatus,
          updatedAt: new Date(),
        };
        
        // Update location when changing status
        if (currentLocation) {
          userUpdateData.latitude = currentLocation.lat;
          userUpdateData.longitude = currentLocation.lng;
          userUpdateData.locationUpdatedAt = new Date();
        }
        
        await updateDoc(doc(db, "users", user.uid), userUpdateData);
      }

      // Send notifications
      if (job.clientId) {
        if (newStatus === "traveling") {
          pushNotifications.providerTravelingToClient(job.clientId, jobId);
        } else if (newStatus === "arrived") {
          pushNotifications.providerArrivedToClient(job.clientId, jobId);
        } else if (newStatus === "in_progress") {
          pushNotifications.jobStartedToClient(job.clientId, jobId, job.serviceCategory || job.serviceType || "Service");
        }
      }
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
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    }
  };

  const copyAddress = () => {
    if (job?.address) {
      navigator.clipboard.writeText(job.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCurrentStepIndex = () => STATUS_STEPS.findIndex((s) => s.key === job?.status);

  if (loading) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Car className="w-10 h-10 text-white" />
            </div>
            <p className="text-white/80 font-medium">Loading tracking...</p>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  if (!job) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center">
          <p className="text-white/60 text-lg mb-4">Job not found</p>
          <button onClick={() => router.push("/provider/jobs")} className="text-blue-400 hover:text-blue-300">
            ← Back to Jobs
          </button>
        </div>
      </ProviderLayout>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const price = job.providerPrice || job.totalAmount || 0;

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => router.back()} 
              className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-emerald-500/20 backdrop-blur-xl rounded-full border border-emerald-500/30">
                <span className="text-emerald-400 text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live Tracking
                </span>
              </div>
            </div>
          </div>

          {/* Live Status Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/60 text-sm mb-1">Current Status</p>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {STATUS_STEPS[currentStepIndex]?.emoji}
                  {STATUS_STEPS[currentStepIndex]?.label || job.status}
                </h2>
              </div>
              {(job.status === "traveling" || job.status === "accepted") && eta && (
                <div className="text-right">
                  <p className="text-white/60 text-sm mb-1">ETA</p>
                  <p className="text-3xl font-bold text-white">{eta}</p>
                  {distance && <p className="text-white/60 text-sm">{distance} away</p>}
                </div>
              )}
            </div>

            {/* Progress Steps */}
            <div className="relative">
              <div className="flex justify-between relative z-10">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isCompleted 
                          ? isCurrent 
                            ? "bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/50 scale-110" 
                            : "bg-gradient-to-br from-emerald-500 to-teal-600"
                          : "bg-white/10 border border-white/20"
                      }`}>
                        <Icon className={`w-6 h-6 ${isCompleted ? "text-white" : "text-white/40"}`} />
                        {isCurrent && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-ping" />
                        )}
                      </div>
                      <p className={`text-xs mt-3 font-medium text-center ${
                        isCurrent ? "text-white" : isCompleted ? "text-emerald-400" : "text-white/40"
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Line */}
              <div className="absolute top-7 left-[14%] right-[14%] h-1 bg-white/10 rounded-full -z-0">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Client Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 mb-6 border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                {clientInfo?.photo ? (
                  <img src={clientInfo.photo} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center border-2 border-slate-900">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{job.clientName}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {clientInfo?.rating && (
                    <span className="flex items-center gap-1 text-amber-400 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      {clientInfo.rating.toFixed(1)}
                    </span>
                  )}
                  {clientInfo?.completedBookings !== undefined && (
                    <span className="text-white/60 text-sm">
                      {clientInfo.completedBookings} bookings
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs mb-1">Earnings</p>
                <p className="text-2xl font-bold text-emerald-400">₱{price.toLocaleString()}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <a 
                href={`tel:${job.clientPhone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-2xl transition-all border border-emerald-500/30"
              >
                <Phone className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Call</span>
              </a>
              <button 
                onClick={() => router.push(`/chat/new?recipientId=${job.clientId}&jobId=${jobId}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-2xl transition-all border border-blue-500/30"
              >
                <MessageCircle className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-semibold">Chat</span>
              </button>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden mb-6 border border-white/20">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Destination</p>
                    <p className="text-white font-medium">{job.address}</p>
                  </div>
                </div>
                <button 
                  onClick={copyAddress}
                  className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                </button>
              </div>
            </div>

            {/* Map */}
            {(job.location || (job.latitude && job.longitude)) && (
              <div className="h-64 relative">
                <DirectionsMapView
                  destination={{ 
                    lat: job.location?.latitude || job.latitude || 0, 
                    lng: job.location?.longitude || job.longitude || 0 
                  }}
                  currentLocation={currentLocation}
                  destinationLabel={job.address}
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/50 to-transparent" />
              </div>
            )}

            <div className="p-4">
              <button
                onClick={openDirections}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition-all shadow-lg shadow-blue-500/30"
              >
                <Navigation className="w-5 h-5 text-white" />
                <span className="text-white font-bold">Open in Google Maps</span>
                <ExternalLink className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 mb-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Service</p>
                <p className="text-white font-bold">{job.serviceCategory || job.serviceType}</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-4">
            {job.status === "accepted" && (
              <button
                onClick={() => updateStatus("traveling")}
                disabled={updating}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-3xl transition-all shadow-2xl shadow-blue-500/30 disabled:opacity-50 group"
              >
                <div className="flex items-center justify-center gap-3">
                  {updating ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <>
                      <Car className="w-6 h-6 text-white group-hover:animate-bounce" />
                      <span className="text-white font-bold text-lg">Start Traveling</span>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </>
                  )}
                </div>
              </button>
            )}

            {job.status === "traveling" && (
              <button
                onClick={() => updateStatus("arrived")}
                disabled={updating}
                className="w-full py-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-3xl transition-all shadow-2xl shadow-violet-500/30 disabled:opacity-50 group"
              >
                <div className="flex items-center justify-center gap-3">
                  {updating ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <>
                      <MapPin className="w-6 h-6 text-white group-hover:animate-bounce" />
                      <span className="text-white font-bold text-lg">I Have Arrived</span>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </>
                  )}
                </div>
              </button>
            )}

            {job.status === "arrived" && (
              <button
                onClick={() => updateStatus("in_progress")}
                disabled={updating}
                className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-3xl transition-all shadow-2xl shadow-amber-500/30 disabled:opacity-50 group"
              >
                <div className="flex items-center justify-center gap-3">
                  {updating ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <>
                      <Wrench className="w-6 h-6 text-white group-hover:animate-bounce" />
                      <span className="text-white font-bold text-lg">Start Working</span>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </>
                  )}
                </div>
              </button>
            )}

            {job.status === "in_progress" && (
              <button
                onClick={() => router.push(`/provider/jobs/${jobId}`)}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-3xl transition-all shadow-2xl shadow-emerald-500/30 group"
              >
                <div className="flex items-center justify-center gap-3">
                  <Zap className="w-6 h-6 text-white group-hover:animate-pulse" />
                  <span className="text-white font-bold text-lg">Go to Job Details</span>
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </div>
              </button>
            )}
          </div>

          {/* Safety Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-sm">
            <Shield className="w-4 h-4" />
            <span>Your location is being shared with the client</span>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
