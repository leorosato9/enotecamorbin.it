import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function RestaurantMap({ points }) {
  // Se non hai punti, mostra un placeholder
  if (!points.length) {
    return <p>Nessun ristorante geolocalizzato disponibile.</p>;
  }

  // Centriamo la mappa sul primo punto
  const center = [points[0].lat, points[0].lng];

  return (
    <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((pt, i) => (
        <Marker key={i} position={[pt.lat, pt.lng]}>
          <Popup>{pt.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
