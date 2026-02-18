'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
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
const createUserIcon = () => L.divIcon({
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
const createProviderIcon = (initial: string, profilePhoto?: string, isSelected: boolean = false, isOnline: boolean = true) => {
  const borderColor = isSelected ? '#00B14F' : (isOnline ? '#00B14F' : '#E5E7EB');
  const borderWidth = isSelected ? '3.5px' : '3px';
  const scale = isSelected ? 'scale(1.1)' : 'scale(1)';
  const shadow = isSelected
    ? '0 4px 12px rgba(0, 177, 79, 0.35)'
    : '0 2px 8px rgba(0,0,0,0.15)';
  const selectedClass = isSelected ? 'marker-selected-glow' : '';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const prevCenterRef = useRef(center);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
      circlesRef.current = [];
      routeLayersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recenter map on center changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latDiff = Math.abs(center.lat - prevCenterRef.current.lat);
    const lngDiff = Math.abs(center.lng - prevCenterRef.current.lng);

    if (latDiff > 0.001 || lngDiff > 0.001) {
      map.flyTo([center.lat, center.lng], map.getZoom(), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
      prevCenterRef.current = center;
    }
  }, [center]);

  // Update user location marker + circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old user marker and circles
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    circlesRef.current.forEach(c => c.remove());
    circlesRef.current = [];

    if (userLocation) {
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: createUserIcon() })
        .addTo(map)
        .bindPopup('Your Location');
      userMarkerRef.current = marker;

      // Outer radius circle
      const outerCircle = L.circle([userLocation.lat, userLocation.lng], {
        radius: 300,
        color: 'rgba(59, 130, 246, 0.2)',
        fillColor: 'rgba(59, 130, 246, 0.06)',
        fillOpacity: 0.6,
        weight: 1.5,
      }).addTo(map);

      // Inner radius circle
      const innerCircle = L.circle([userLocation.lat, userLocation.lng], {
        radius: 100,
        color: 'rgba(59, 130, 246, 0.3)',
        fillColor: 'rgba(59, 130, 246, 0.1)',
        fillOpacity: 0.8,
        weight: 1.5,
      }).addTo(map);

      circlesRef.current = [outerCircle, innerCircle];
    }
  }, [userLocation]);

  // Update provider markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(providers.map(p => p.id));

    // Remove markers that no longer exist
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    providers.forEach((provider) => {
      if (!provider.latitude || !provider.longitude) return;

      const isSelected = selectedProviderId === provider.id;
      const icon = createProviderIcon(
        provider.firstName?.[0] || 'P',
        provider.profilePhoto,
        isSelected,
        provider.isOnline !== false
      );

      const existingMarker = markersRef.current.get(provider.id);
      if (existingMarker) {
        existingMarker.setIcon(icon);
        existingMarker.setLatLng([provider.latitude, provider.longitude]);
        existingMarker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([provider.latitude, provider.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        marker.on('click', () => {
          onProviderClick(provider.id);
        });

        marker.bindPopup(`
          <div class="text-center cursor-pointer min-w-[120px]">
            <p class="font-semibold">${provider.firstName} ${provider.lastName}</p>
            <p class="text-sm text-gray-500">${provider.serviceCategory}</p>
            <p class="text-xs text-emerald-600 mt-1 font-medium">Tap to select</p>
          </div>
        `);

        markersRef.current.set(provider.id, marker);
      }
    });
  }, [providers, selectedProviderId, onProviderClick]);

  // Get selected provider for route
  const selectedProvider = useMemo(() => {
    if (!selectedProviderId) return null;
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [selectedProviderId, providers]);

  // Fetch route when provider is selected
  useEffect(() => {
    if (!userLocation || !selectedProvider?.latitude || !selectedProvider?.longitude) {
      setRouteCoordinates(null);
      return;
    }

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
    });
  }, [userLocation, selectedProvider]);

  // Draw/clear route lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old route layers
    routeLayersRef.current.forEach(l => l.remove());
    routeLayersRef.current = [];

    if (routeCoordinates && routeCoordinates.length > 0) {
      // Shadow/glow line underneath
      const shadowLine = L.polyline(routeCoordinates, {
        color: 'rgba(59, 130, 246, 0.2)',
        weight: 10,
        opacity: 0.8,
      }).addTo(map);

      // Main route line
      const mainLine = L.polyline(routeCoordinates, {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.9,
      }).addTo(map);

      routeLayersRef.current = [shadowLine, mainLine];
    }
  }, [routeCoordinates]);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
  );
}
