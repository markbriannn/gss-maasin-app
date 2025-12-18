'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Green custom marker for the location pin
const greenIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
      <path fill="#00B14F" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="white" cx="12" cy="9" r="2.5"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Component to handle map click events
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map when coordinates change
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevCoordsRef = useRef({ lat, lng });

  useEffect(() => {
    // Only recenter if coordinates changed significantly (more than 0.0001 degrees)
    const latDiff = Math.abs(lat - prevCoordsRef.current.lat);
    const lngDiff = Math.abs(lng - prevCoordsRef.current.lng);
    
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      map.setView([lat, lng], map.getZoom());
      prevCoordsRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

// Draggable marker component
function DraggableMarker({ 
  position, 
  onDragEnd 
}: { 
  position: [number, number]; 
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const latlng = marker.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={greenIcon}
    />
  );
}



export default function InteractiveMap({ latitude, longitude, onLocationChange }: InteractiveMapProps) {
  const handleLocateClick = () => {
    console.log('Locate button clicked!');
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        console.log('Location found:', lat, lng);
        onLocationChange(lat, lng);
        alert(`Location found!\nAccuracy: ~${Math.round(accuracy)}m`);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enable location services or enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 relative">
      <div className="relative" style={{ height: '250px' }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationChange={onLocationChange} />
          <MapRecenter lat={latitude} lng={longitude} />
          <DraggableMarker 
            position={[latitude, longitude]} 
            onDragEnd={onLocationChange}
          />
        </MapContainer>
        
        {/* Locate button - positioned outside Leaflet */}
        <button
          type="button"
          onClick={handleLocateClick}
          className="absolute top-3 right-3 bg-white rounded-full w-11 h-11 shadow-lg flex items-center justify-center hover:bg-gray-50 border-2 border-[#00B14F] cursor-pointer"
          style={{ zIndex: 1000 }}
          title="Get my current location"
        >
          {/* Crosshair/Target icon for location */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00B14F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
      </div>
      
      <div className="bg-gray-50 p-3">
        <p className="text-xs text-gray-500 text-center">
          📍 Click the green arrow button or tap on map to set your location
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
