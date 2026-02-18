'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  profilePhoto?: string;
  latitude?: number;
  longitude?: number;
  isOnline?: boolean;
}

interface ClientMapViewProps {
  providers: Provider[];
  userLocation: { lat: number; lng: number } | null;
  center: { lat: number; lng: number };
  onProviderClick: (providerId: string) => void;
  selectedProviderId?: string | null;
}

// Animated user location icon with pulse ring (Grab-style)
const userIcon = L.divIcon({
  className: 'custom-marker user-location-pulse',
  html: `
    <div style="position: relative; width: 32px; height: 32px;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.12);
        border: 1.5px solid rgba(59, 130, 246, 0.25);
        animation: radarPulse 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.08);
        border: 1.5px solid rgba(59, 130, 246, 0.15);
        animation: radarPulse 2s ease-out infinite 1s;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3B82F6;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      "></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Create provider marker with Grab/iOS-style design
const createProviderIcon = (initial: string, profilePhoto?: string, isSelected: boolean = false, isOnline: boolean = true, index: number = 0) => {
  const selectedClass = isSelected ? 'marker-selected-glow' : '';
  const borderColor = isSelected ? '#00B14F' : (isOnline ? '#00B14F' : '#E5E7EB');
  const borderWidth = isSelected ? '3.5px' : '3px';
  const scale = isSelected ? 'scale(1.1)' : 'scale(1)';
  const shadow = isSelected
    ? '0 4px 12px rgba(0, 177, 79, 0.35)'
    : '0 2px 8px rgba(0,0,0,0.15)';

  const onlineDot = isOnline ? `
    <div style="
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #00B14F;
      border: 2.5px solid white;
      z-index: 2;
    " class="online-indicator-map"></div>
  ` : '';

  const selectedRing = isSelected ? `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(0, 177, 79, 0.12);
      border: 2px solid rgba(0, 177, 79, 0.25);
    "></div>
  ` : '';

  if (profilePhoto) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="provider-marker-container" style="position: relative; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px;">
          ${selectedRing}
          <div class="${selectedClass}" style="
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: ${borderWidth} solid ${borderColor};
            box-shadow: ${shadow};
            overflow: hidden;
            background-color: #FFF;
            transform: ${scale};
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          ">
            <img
              src="${profilePhoto}"
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#00B14F;font-weight:800;font-size:18px;background:#F0FDF4;\\'>${initial}</div>'"
            />
          </div>
          ${onlineDot}
        </div>
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
      popupAnchor: [0, -32],
    });
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="provider-marker-container" style="position: relative; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px;">
        ${selectedRing}
        <div class="${selectedClass}" style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: ${borderWidth} solid ${borderColor};
          box-shadow: ${shadow};
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F0FDF4;
          transform: ${scale};
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        ">
          <span style="font-size: 18px; font-weight: 800; color: #00B14F;">${initial}</span>
        </div>
        ${onlineDot}
      </div>
    `,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
    popupAnchor: [0, -32],
  });
};

// Component to recenter map with smooth animation
function MapController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const prevCenter = useRef(center);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      map.setView([center.lat, center.lng], 14);
      initialized.current = true;
      prevCenter.current = center;
      return;
    }

    const latDiff = Math.abs(center.lat - prevCenter.current.lat);
    const lngDiff = Math.abs(center.lng - prevCenter.current.lng);

    if (latDiff > 0.001 || lngDiff > 0.001) {
      // Smooth fly-to animation (iOS-like)
      map.flyTo([center.lat, center.lng], map.getZoom(), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

// Fetch route from OSRM (Open Source Routing Machine)
async function fetchRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // OSRM returns [lng, lat], we need [lat, lng] for Leaflet
      return data.routes[0].geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
    }
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

export default function ClientMapView({ providers, userLocation, center, onProviderClick, selectedProviderId }: ClientMapViewProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted before rendering map
  // Use a small delay + unique key to avoid Strict Mode double-mount crash
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
      setMapKey(prev => prev + 1);
    };
  }, []);

  // Memoize provider icons - now includes selected state and index for staggered animation
  const providerIcons = useMemo(() => {
    const icons: Record<string, L.DivIcon> = {};
    providers.forEach((p, index) => {
      const isSelected = selectedProviderId === p.id;
      icons[p.id] = createProviderIcon(
        p.firstName?.[0] || 'P',
        p.profilePhoto,
        isSelected,
        p.isOnline !== false,
        index
      );
    });
    return icons;
  }, [providers, selectedProviderId]);

  // Get selected provider for route
  const selectedProvider = useMemo(() => {
    if (!selectedProviderId) return null;
    return providers.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, providers]);

  // Fetch actual road route when provider is selected
  useEffect(() => {
    if (!userLocation || !selectedProvider?.latitude || !selectedProvider?.longitude) {
      setRouteCoordinates(null);
      return;
    }

    setIsLoadingRoute(true);
    fetchRoute(
      userLocation,
      { lat: selectedProvider.latitude, lng: selectedProvider.longitude }
    ).then(route => {
      if (route) {
        setRouteCoordinates(route);
      } else {
        // Fallback to straight line if routing fails
        setRouteCoordinates([
          [userLocation.lat, userLocation.lng],
          [selectedProvider.latitude!, selectedProvider.longitude!]
        ]);
      }
      setIsLoadingRoute(false);
    });
  }, [userLocation, selectedProvider]);

  // Don't render map until component is mounted
  if (!isMounted) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div className="animate-pulse text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        key={`client-map-${mapKey}`}
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} />

        {/* Route lines - Grab-style with glow effect */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <>
            {/* Shadow/glow line underneath */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: 'rgba(59, 130, 246, 0.2)',
                weight: 10,
                opacity: 0.8,
              }}
            />
            {/* Main route line */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#3B82F6',
                weight: 5,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* User location marker with animated pulse */}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>Your Location</Popup>
            </Marker>
            {/* Outer radius circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={300}
              pathOptions={{
                color: 'rgba(59, 130, 246, 0.2)',
                fillColor: 'rgba(59, 130, 246, 0.06)',
                fillOpacity: 0.6,
                weight: 1.5,
              }}
            />
            {/* Inner radius circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={100}
              pathOptions={{
                color: 'rgba(59, 130, 246, 0.3)',
                fillColor: 'rgba(59, 130, 246, 0.1)',
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* Provider markers with animated bounce-in */}
        {providers.map((provider) => {
          if (!provider.latitude || !provider.longitude) return null;
          const isSelected = selectedProviderId === provider.id;

          return (
            <Marker
              key={provider.id}
              position={[provider.latitude, provider.longitude]}
              icon={providerIcons[provider.id]}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: (e) => {
                  // Prevent popup from interfering
                  e.originalEvent.stopPropagation();
                  onProviderClick(provider.id);
                },
              }}
            >
              <Popup closeOnClick={true} autoClose={true}>
                <div
                  className="text-center cursor-pointer min-w-[120px]"
                  onClick={() => onProviderClick(provider.id)}
                >
                  <p className="font-semibold">{provider.firstName} {provider.lastName}</p>
                  <p className="text-sm text-gray-500">{provider.serviceCategory}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Tap to select</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
