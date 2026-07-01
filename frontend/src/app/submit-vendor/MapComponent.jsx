"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker 
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition(pos);
        }
      }}
    />
  );
}

export default function MapComponent({ cityLat, cityLng, lat, lng, onLocationChange }) {
  const [position, setPosition] = useState(
    lat && lng ? { lat, lng } : (cityLat && cityLng ? { lat: cityLat, lng: cityLng } : { lat: 20.5937, lng: 78.9629 }) // Default to India
  );

  // Update parent when position changes
  useEffect(() => {
    if (position.lat && position.lng) {
      onLocationChange(position.lat, position.lng);
    }
  }, [position]);

  // Sync state if parent lat/lng changes externally (e.g. Detect Location)
  useEffect(() => {
    if (lat && lng && (lat !== position.lat || lng !== position.lng)) {
      setPosition({ lat, lng });
    }
  }, [lat, lng]);

  return (
    <MapContainer 
      center={position} 
      zoom={cityLat ? 13 : 5} 
      scrollWheelZoom={true} 
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem", zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}
