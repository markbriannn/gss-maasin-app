'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DirectionsMapViewProps {
  destination: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number } | null;
  destinationLabel?: string;
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
  popupAnchor: [0, -16],
});

// Red marker for destination
const destinationIcon = new L.Icon({
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
function MapController({ destination, currentLocation }: { destination: { lat: number; lng: number }; currentLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      if (currentLocation) {
        const bounds = L.latLngBounds(
          [currentLocation.lat, currentLocation.lng],
          [destination.lat, destination.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([destination.lat, destination.lng], 15);
      }
      initialized.current = true;
    }
  }, [destination, currentLocation, map]);

  return null;
}

export default function DirectionsMapView({ destination, currentLocation, destinationLabel }: DirectionsMapViewProps) {
  // Create a simple line between points if both exist
  const linePositions = currentLocation 
    ? [[currentLocation.lat, currentLocation.lng], [destination.lat, destination.lng]] as [number, number][]
    : [];

  return (
    <MapContainer
      center={[destination.lat, destination.lng]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController destination={destination} currentLocation={currentLocation} />
      
      {/* User location marker */}
      {currentLocation && (
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={userIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      
      {/* Destination marker */}
      <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
        <Popup>{destinationLabel || 'Destination'}</Popup>
      </Marker>
      
      {/* Line between points */}
      {linePositions.length === 2 && (
        <Polyline
          positions={linePositions}
          pathOptions={{ color: '#3B82F6', weight: 3, dashArray: '10, 10' }}
        />
      )}
    </MapContainer>
  );
}
