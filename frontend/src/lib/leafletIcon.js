// Leaflet's default marker images, bundled with the site (instead of hot-linking unpkg.com).
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const src = (m) => (typeof m === 'string' ? m : m && m.src);

export const DefaultIcon = L.icon({
  iconUrl: src(iconUrl),
  iconRetinaUrl: src(iconRetinaUrl),
  shadowUrl: src(shadowUrl),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;
