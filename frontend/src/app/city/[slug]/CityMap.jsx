"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../lib/leafletIcon';
import { directionsUrl, hasCoords, vendorCuisine } from '../../../lib/vendors';

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center[0], center[1], map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function CityMap({ cityLat, cityLng, vendors }) {
  if (!cityLat || !cityLng) return null;

  // Locked (premium) vendors carry no coordinates; anything else without a valid pin is skipped too.
  const pins = (vendors || []).filter(hasCoords);

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
      {pins.map(v => (
        <Marker key={v.id} position={[Number(v.lat), Number(v.lng)]}>
          <Popup>
            <div className="text-center">
              <Link href={`/vendor/${v.id}`} className="text-sm font-extrabold" style={{ color: '#1c1917' }}>{v.name}</Link><br/>
              {vendorCuisine(v) && <><span className="text-xs text-stone-500">{vendorCuisine(v)}</span><br/></>}
              <a
                href={directionsUrl(v)}
                target="_blank"
                rel="noreferrer"
                className="bg-brand-500 font-bold text-[10px] px-3 py-1.5 rounded mt-2 inline-block shadow-sm"
                style={{ color: '#fff' }}
              >
                Get Directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
