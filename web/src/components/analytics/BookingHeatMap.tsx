'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface BookingLocation {
  lat: number;
  lng: number;
  intensity: number;
}

interface BookingHeatMapProps {
  bookings: BookingLocation[];
  center?: [number, number];
  zoom?: number;
}

export default function BookingHeatMap({ 
  bookings, 
  center = [10.1335, 124.8359], // Maasin City, Southern Leyte
  zoom = 13 
}: BookingHeatMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing heat layer
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) return;
      mapRef.current?.removeLayer(layer);
    });

    // Prepare heat map data
    const heatData = bookings.map(booking => [
      booking.lat,
      booking.lng,
      booking.intensity
    ]) as [number, number, number][];

    // Add heat layer
    if (heatData.length > 0) {
      // @ts-ignore - leaflet.heat types
      L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.0: '#3B82F6',  // Blue (low)
          0.3: '#10B981',  // Green
          0.5: '#F59E0B',  // Yellow/Orange
          0.7: '#EF4444',  // Red
          1.0: '#DC2626'   // Dark Red (high)
        }
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [bookings, center, zoom]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">🗺️ Booking Heat Map</h3>
        <div className="text-sm text-gray-500">Maasim City</div>
      </div>
      
      <div 
        ref={mapContainerRef} 
        className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200"
      />
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-sm text-gray-600">Low Demand</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-sm text-gray-600">Medium Demand</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span className="text-sm text-gray-600">High Demand</span>
        </div>
      </div>
    </div>
  );
}
