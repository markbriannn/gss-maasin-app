'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapViewProps {
  providerLocation?: { lat: number; lng: number } | null;
  clientLocation?: { lat: number; lng: number } | null;
  providerName?: string;
}

// Blue marker for provider location
const providerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#00B14F" stroke="#FFFFFF" stroke-width="3"/>
      <path fill="white" d="M20 12c-3.31 0-6 2.69-6 6s6 10 6 10 6-6.69 6-10-2.69-6-6-6zm0 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Red marker for client/destination location
const clientIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="40">
      <path fill="#EF4444" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="white" cx="12" cy="9" r="2.5"/>
    </svg>
  `),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

// Component to fit bounds
function MapController({ providerLocation, clientLocation }: { providerLocation?: { lat: number; lng: number } | null; clientLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (providerLocation && clientLocation && !initialized.current) {
      const bounds = L.latLngBounds(
        [providerLocation.lat, providerLocation.lng],
        [clientLocation.lat, clientLocation.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      initialized.current = true;
    } else if (providerLocation && !initialized.current) {
      map.setView([providerLocation.lat, providerLocation.lng], 15);
      initialized.current = true;
    } else if (clientLocation && !initialized.current) {
      map.setView([clientLocation.lat, clientLocation.lng], 15);
      initialized.current = true;
    }
  }, [providerLocation, clientLocation, map]);

  // Update view when provider moves
  useEffect(() => {
    if (providerLocation && initialized.current) {
      if (clientLocation) {
        const bounds = L.latLngBounds(
          [providerLocation.lat, providerLocation.lng],
          [clientLocation.lat, clientLocation.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [providerLocation, clientLocation, map]);

  return null;
}

export default function TrackingMapView({ providerLocation, clientLocation, providerName }: TrackingMapViewProps) {
  // Default center
  const defaultCenter = clientLocation || providerLocation || { lat: 10.1311, lng: 124.8334 };
  
  // Create a line between points if both exist
  const linePositions = providerLocation && clientLocation
    ? [[providerLocation.lat, providerLocation.lng], [clientLocation.lat, clientLocation.lng]] as [number, number][]
    : [];

  return (
    <MapContainer
      center={[defaultCenter.lat, defaultCenter.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController providerLocation={providerLocation} clientLocation={clientLocation} />
      
      {/* Provider location marker */}
      {providerLocation && (
        <>
          <Marker position={[providerLocation.lat, providerLocation.lng]} icon={providerIcon}>
            <Popup>{providerName || 'Provider'}</Popup>
          </Marker>
          <Circle
            center={[providerLocation.lat, providerLocation.lng]}
            radius={100}
            pathOptions={{ color: '#00B14F', fillColor: '#00B14F', fillOpacity: 0.15, weight: 2 }}
          />
        </>
      )}
      
      {/* Client/destination marker */}
      {clientLocation && (
        <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      
      {/* Line between points */}
      {linePositions.length === 2 && (
        <Polyline
          positions={linePositions}
          pathOptions={{ color: '#3B82F6', weight: 4, dashArray: '10, 10' }}
        />
      )}
    </MapContainer>
  );
}
