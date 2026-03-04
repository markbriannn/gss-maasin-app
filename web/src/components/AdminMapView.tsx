'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  latitude?: number;
  longitude?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  isOnline: boolean;
  profilePhoto?: string;
  status: 'available' | 'offline' | 'traveling' | 'arrived' | 'working' | 'pending';
}

interface ActiveJob {
  id: string;
  latitude?: number;
  longitude?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: string;
}

interface AdminMapViewProps {
  providers: Provider[];
  activeJobs: ActiveJob[];
  center: { lat: number; lng: number };
  onProviderClick: (provider: Provider) => void;
}

// Status colors
const statusColors: Record<string, string> = {
  available: '#10B981',
  traveling: '#3B82F6',
  arrived: '#8B5CF6',
  working: '#F59E0B',
  offline: '#6B7280',
  pending: '#EF4444',
};

// Status label text
const statusLabels: Record<string, string> = {
  available: 'Available',
  traveling: 'Traveling',
  arrived: 'Arrived',
  working: 'Working',
  offline: 'Offline',
  pending: 'Pending',
};

// Create marker with profile photo, name label, and availability status (like reference image)
const createStatusIcon = (status: string, initial: string, name: string, profilePhoto?: string) => {
  const color = statusColors[status] || '#6B7280';
  const statusLabel = statusLabels[status] || 'Offline';
  const shortName = name.length > 10 ? name.slice(0, 10) + '.' : name;

  const photoHtml = profilePhoto
    ? `<img src="${profilePhoto}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:bold;font-size:13px;\\'>${initial}</div>'" />`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:bold;font-size:13px;">${initial}</div>`;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
        <div style="
          width:38px;height:38px;border-radius:50%;
          border:3px solid ${color};
          box-shadow:0 2px 10px rgba(0,0,0,0.25);
          overflow:hidden;background-color:${color};
        ">
          ${photoHtml}
        </div>
        <div style="
          margin-top:2px;
          background:white;
          border-radius:6px;
          padding:2px 6px;
          box-shadow:0 1px 6px rgba(0,0,0,0.18);
          white-space:nowrap;
          text-align:center;
          line-height:1.2;
          min-width:60px;
        ">
          <div style="font-size:10px;font-weight:700;color:#1f2937;">${shortName}</div>
          <div style="font-size:8px;color:${color};font-weight:600;">${statusLabel}</div>
        </div>
      </div>
    `,
    iconSize: [80, 70],
    iconAnchor: [40, 35],
    popupAnchor: [0, -35],
  });
};

// Job location marker
const jobIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="#EF4444" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="white" cx="12" cy="9" r="2.5"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to recenter map
function MapController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      map.setView([center.lat, center.lng], 13);
      initialized.current = true;
    }
  }, [center, map]);

  return null;
}

export default function AdminMapView({ providers, activeJobs, center, onProviderClick }: AdminMapViewProps) {
  // Memoize provider icons
  const providerIcons = useMemo(() => {
    const icons: Record<string, L.Icon | L.DivIcon> = {};
    providers.forEach(p => {
      const initial = p.firstName?.[0] || 'P';
      const shortName = `${p.firstName || ''} ${(p.lastName || '')[0] || ''}.`.trim();
      icons[p.id] = createStatusIcon(p.status, initial, shortName, p.profilePhoto);
    });
    return icons;
  }, [providers]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} />

      {/* Provider markers */}
      {providers.map((provider) => {
        const lat = provider.currentLocation?.latitude || provider.latitude;
        const lng = provider.currentLocation?.longitude || provider.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker
            key={provider.id}
            position={[lat, lng]}
            icon={providerIcons[provider.id]}
            eventHandlers={{
              click: () => onProviderClick(provider),
            }}
          >
            <Popup>
              <div className="text-center min-w-[120px]">
                <p className="font-semibold">{provider.firstName} {provider.lastName}</p>
                <p className="text-sm text-gray-500">{provider.serviceCategory}</p>
                <p className="text-xs mt-1 capitalize">{provider.status}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Active job markers */}
      {activeJobs.map((job) => {
        const lat = job.location?.latitude || job.latitude;
        const lng = job.location?.longitude || job.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker
            key={`job-${job.id}`}
            position={[lat, lng]}
            icon={jobIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold">Active Job</p>
                <p className="text-sm text-gray-500 capitalize">{job.status}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
