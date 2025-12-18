"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the Leaflet map component (client-side only)
const DirectionsMapView = dynamic(
  () => import("@/components/DirectionsMapView"),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-64 w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#00B14F] animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    )
  }
);

interface LocationData {
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  clientName?: string;
  providerName?: string;
}

export default function DirectionsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<"driving" | "walking" | "transit">("driving");

  useEffect(() => {
    if (bookingId) {
      fetchBookingLocation();
    }
  }, [bookingId]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const fetchBookingLocation = async () => {
    try {
      const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
      if (bookingDoc.exists()) {
        const data = bookingDoc.data();
        setLocationData({
          address: data.address || "Address not available",
          location: data.location,
          clientName: data.clientName,
          providerName: data.providerName,
        });
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (!locationData?.location) return;

    const { latitude, longitude } = locationData.location;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    if (currentLocation) {
      url += `&origin=${currentLocation.lat},${currentLocation.lng}`;
    }

    url += `&travelmode=${travelMode}`;
    window.open(url, "_blank");
  };

  const openWaze = () => {
    if (!locationData?.location) return;

    const { latitude, longitude } = locationData.location;
    const url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    window.open(url, "_blank");
  };

  const copyAddress = () => {
    if (locationData?.address) {
      navigator.clipboard.writeText(locationData.address);
      alert("Address copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!locationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg">Location not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-green-500 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800">
            ← Back
          </button>
          <h1 className="text-xl font-bold">Directions</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {/* Destination Card */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-2">Destination</h2>
          <p className="text-gray-700 mb-4">{locationData.address}</p>
          
          {locationData.location && (
            <p className="text-sm text-gray-500 mb-4">
              Coordinates: {locationData.location.latitude.toFixed(6)}, {locationData.location.longitude.toFixed(6)}
            </p>
          )}

          <button
            onClick={copyAddress}
            className="text-green-600 text-sm hover:underline"
          >
            📋 Copy Address
          </button>
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="font-semibold mb-2">Your Location</h2>
            <p className="text-sm text-gray-500">
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Travel Mode */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Travel Mode</h2>
          <div className="flex gap-3">
            {[
              { mode: "driving", icon: "🚗", label: "Drive" },
              { mode: "walking", icon: "🚶", label: "Walk" },
              { mode: "transit", icon: "🚌", label: "Transit" },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setTravelMode(mode as typeof travelMode)}
                className={`flex-1 py-3 rounded-lg border ${
                  travelMode === mode
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <p className="text-sm mt-1">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map */}
        {locationData.location && (
          <div className="bg-white border rounded-lg overflow-hidden mb-6 h-64">
            <DirectionsMapView
              destination={{ lat: locationData.location.latitude, lng: locationData.location.longitude }}
              currentLocation={currentLocation}
              destinationLabel={locationData.address}
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="space-y-3">
          <button
            onClick={openGoogleMaps}
            className="w-full bg-blue-500 text-white py-4 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🗺️</span>
            Open in Google Maps
          </button>

          <button
            onClick={openWaze}
            className="w-full bg-cyan-500 text-white py-4 rounded-lg hover:bg-cyan-600 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🚗</span>
            Open in Waze
          </button>

          <button
            onClick={() => {
              if (locationData.location) {
                const url = `https://maps.apple.com/?daddr=${locationData.location.latitude},${locationData.location.longitude}`;
                window.open(url, "_blank");
              }
            }}
            className="w-full bg-gray-800 text-white py-4 rounded-lg hover:bg-gray-900 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🍎</span>
            Open in Apple Maps
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">💡 Navigation Tips</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Make sure location services are enabled on your device</li>
            <li>• Download offline maps for areas with poor connectivity</li>
            <li>• Contact the client if you have trouble finding the location</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
