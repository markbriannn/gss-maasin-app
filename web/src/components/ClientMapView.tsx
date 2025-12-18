'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
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
}

interface ClientMapViewProps {
  providers: Provider[];
  userLocation: { lat: number; lng: number } | null;
  center: { lat: number; lng: number };
  onProviderClick: (providerId: string) => void;
}

// Blue marker for user location
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle fill="#3B82F6" cx="12" cy="12" r="8" stroke="white" stroke-width="3"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Create provider marker with photo or initial
const createProviderIcon = (initial: string, profilePhoto?: string) => {
  if (profilePhoto) {
    // Create marker with profile photo using HTML
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          overflow: hidden;
          background-color: #00B14F;
        ">
          <img 
            src="${profilePhoto}" 
            style="width: 100%; height: 100%; object-fit: cover;"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:bold;font-size:18px;\\'>${initial}</div>'"
          />
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }
  
  // Fallback to initial letter
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="#00B14F" stroke="#FFFFFF" stroke-width="3"/>
        <text x="22" y="28" text-anchor="middle" fill="white" font-size="18" font-weight="bold">${initial}</text>
      </svg>
    `),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Component to recenter map
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
      map.setView([center.lat, center.lng], map.getZoom());
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

export default function ClientMapView({ providers, userLocation, center, onProviderClick }: ClientMapViewProps) {
  // Memoize provider icons
  const providerIcons = useMemo(() => {
    const icons: Record<string, L.Icon | L.DivIcon> = {};
    providers.forEach(p => {
      if (!icons[p.id]) {
        icons[p.id] = createProviderIcon(p.firstName?.[0] || 'P', p.profilePhoto);
      }
    });
    return icons;
  }, [providers]);

  return (
    <MapContainer
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
      
      {/* User location marker */}
      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={300}
            pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.1, weight: 2 }}
          />
        </>
      )}
      
      {/* Provider markers */}
      {providers.map((provider) => {
        if (!provider.latitude || !provider.longitude) return null;
        
        return (
          <Marker
            key={provider.id}
            position={[provider.latitude, provider.longitude]}
            icon={providerIcons[provider.id]}
            eventHandlers={{
              click: () => onProviderClick(provider.id),
            }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold">{provider.firstName} {provider.lastName}</p>
                <p className="text-sm text-gray-500">{provider.serviceCategory}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
