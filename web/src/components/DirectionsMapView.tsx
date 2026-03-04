'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface DirectionsMapViewProps {
  destination: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number } | null;
  destinationLabel?: string;
}

// Green pulsing dot for user/provider location
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;">
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:#00B14F;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,177,79,0.4);
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Green destination marker with home icon
const destinationIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:#00B14F;
        box-shadow:0 2px 10px rgba(0,177,79,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
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
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const lastRouteKey = useRef<string>('');

  // Fetch actual road route when both locations are available
  useEffect(() => {
    if (!currentLocation) {
      setRouteCoordinates(null);
      return;
    }

    // Create a key to avoid refetching for small movements
    const routeKey = `${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;

    if (routeKey === lastRouteKey.current) return;
    lastRouteKey.current = routeKey;

    fetchRoute(currentLocation, destination).then(route => {
      if (route) {
        setRouteCoordinates(route);
      } else {
        // Fallback to straight line if routing fails
        setRouteCoordinates([
          [currentLocation.lat, currentLocation.lng],
          [destination.lat, destination.lng]
        ]);
      }
    });
  }, [currentLocation, destination]);

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

      {/* Route line following actual roads */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{ color: '#00B14F', weight: 5, opacity: 0.85 }}
        />
      )}
    </MapContainer>
  );
}
