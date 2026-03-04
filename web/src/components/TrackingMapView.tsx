'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
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

interface TrackingMapViewProps {
  providerLocation?: { lat: number; lng: number } | null;
  clientLocation?: { lat: number; lng: number } | null;
  providerName?: string;
  providerPhoto?: string;
  providerCategory?: string;
  providerRating?: number;
  distance?: string | null;
  duration?: string | null;
}

// Create styled provider marker with photo, name, category, rating, and distance info
const createProviderIcon = (
  name: string,
  photo?: string,
  category?: string,
  rating?: number,
  distance?: string | null,
  duration?: string | null
) => {
  const initial = name?.[0] || 'P';
  const stars = rating ? '★'.repeat(Math.round(rating)) : '★★★★★';
  const distanceText = distance && duration ? `${distance} km away - ${duration} min` : '';

  const photoHtml = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:bold;font-size:14px;background:#00B14F;border-radius:50%;\\'>${initial}</div>'" />`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:bold;font-size:14px;background:#00B14F;border-radius:50%;">${initial}</div>`;

  return L.divIcon({
    className: 'custom-provider-marker',
    html: `
      <div style="display:flex;align-items:flex-start;gap:8px;position:relative;">
        <div style="
          width:42px;height:42px;border-radius:50%;
          border:3px solid #00B14F;
          box-shadow:0 2px 12px rgba(0,0,0,0.25);
          overflow:hidden;background:#00B14F;
          flex-shrink:0;
        ">
          ${photoHtml}
        </div>
        <div style="
          background:white;
          border-radius:10px;
          padding:6px 10px;
          box-shadow:0 2px 12px rgba(0,0,0,0.15);
          white-space:nowrap;
          line-height:1.3;
          min-width:100px;
          margin-top:-2px;
        ">
          <div style="font-size:10px;color:#F59E0B;letter-spacing:1px;">${stars}</div>
          <div style="font-size:11px;font-weight:700;color:#1f2937;">${name}${category ? ' - ' + category : ''}</div>
          ${distanceText ? `
          <div style="display:flex;align-items:center;gap:3px;margin-top:2px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00B14F" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#00B14F"/></svg>
            <span style="font-size:10px;color:#6B7280;">${distanceText}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `,
    iconSize: [220, 60],
    iconAnchor: [21, 30],
    popupAnchor: [90, -30],
  });
};

// Green destination marker (home/client location) matching reference
const clientIcon = L.divIcon({
  className: 'custom-client-marker',
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

// Component to fit bounds and handle marker updates
function MapController({ providerLocation, clientLocation }: { providerLocation?: { lat: number; lng: number } | null; clientLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (providerLocation && clientLocation && !initialized.current) {
      const bounds = L.latLngBounds(
        [providerLocation.lat, providerLocation.lng],
        [clientLocation.lat, clientLocation.lng]
      );
      map.fitBounds(bounds, { padding: [80, 80] });
      initialized.current = true;
    } else if (providerLocation && !initialized.current) {
      map.setView([providerLocation.lat, providerLocation.lng], 15);
      initialized.current = true;
    } else if (clientLocation && !initialized.current) {
      map.setView([clientLocation.lat, clientLocation.lng], 15);
      initialized.current = true;
    }
  }, [providerLocation, clientLocation, map]);

  // Update view when provider moves - keep both markers in view
  useEffect(() => {
    if (providerLocation && clientLocation && initialized.current) {
      const bounds = L.latLngBounds(
        [providerLocation.lat, providerLocation.lng],
        [clientLocation.lat, clientLocation.lng]
      );
      // Only fit bounds if provider is outside current view
      if (!map.getBounds().contains([providerLocation.lat, providerLocation.lng])) {
        map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 0.5 });
      }
    }
  }, [providerLocation, clientLocation, map]);

  return null;
}

export default function TrackingMapView({
  providerLocation,
  clientLocation,
  providerName,
  providerPhoto,
  providerCategory,
  providerRating,
  distance,
  duration,
}: TrackingMapViewProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const lastRouteKey = useRef<string>('');

  // Default center
  const defaultCenter = clientLocation || providerLocation || { lat: 10.1311, lng: 124.8334 };

  // Create provider icon with info label
  const providerIcon = createProviderIcon(
    providerName || 'Provider',
    providerPhoto,
    providerCategory,
    providerRating,
    distance,
    duration
  );

  // Fetch actual road route when both locations are available
  useEffect(() => {
    if (!providerLocation || !clientLocation) {
      setRouteCoordinates(null);
      return;
    }

    // Create a key to avoid refetching for small movements
    const routeKey = `${providerLocation.lat.toFixed(4)},${providerLocation.lng.toFixed(4)}-${clientLocation.lat.toFixed(4)},${clientLocation.lng.toFixed(4)}`;

    if (routeKey === lastRouteKey.current) return;
    lastRouteKey.current = routeKey;

    fetchRoute(providerLocation, clientLocation).then(route => {
      if (route) {
        setRouteCoordinates(route);
      } else {
        // Fallback to straight line if routing fails
        setRouteCoordinates([
          [providerLocation.lat, providerLocation.lng],
          [clientLocation.lat, clientLocation.lng]
        ]);
      }
    });
  }, [providerLocation, clientLocation]);

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

      {/* Provider location marker with info label */}
      {providerLocation && (
        <>
          <Marker position={[providerLocation.lat, providerLocation.lng]} icon={providerIcon}>
            <Popup>{providerName || 'Provider'}</Popup>
          </Marker>
          <Circle
            center={[providerLocation.lat, providerLocation.lng]}
            radius={80}
            pathOptions={{ color: '#00B14F', fillColor: '#00B14F', fillOpacity: 0.1, weight: 1.5 }}
          />
        </>
      )}

      {/* Client/destination marker (home icon) */}
      {clientLocation && (
        <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* Route line following actual roads - GREEN like reference */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{ color: '#00B14F', weight: 5, opacity: 0.85 }}
        />
      )}
    </MapContainer>
  );
}
