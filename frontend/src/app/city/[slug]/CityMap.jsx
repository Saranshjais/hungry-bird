"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function CityMap({ cityLat, cityLng, vendors }) {
  if (!cityLat || !cityLng) return null;

  return (
    <MapContainer 
      center={[cityLat, cityLng]} 
      zoom={13} 
      scrollWheelZoom={true} 
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      <ChangeView center={[cityLat, cityLng]} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {vendors.map(v => (
        v.lat && v.lng && (
          <Marker key={v.id} position={[v.lat, v.lng]}>
            <Popup>
              <div className="text-center">
                <strong className="text-stone-900 text-sm font-extrabold">{v.name}</strong><br/>
                <span className="text-xs text-stone-500">{v.cuisine_type}</span><br/>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-brand-500 text-white font-bold text-[10px] px-3 py-1.5 rounded mt-2 inline-block shadow-sm"
                >
                  Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
