import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  type?: 'PICKUP' | 'DELIVERY';
}

interface MapProps {
  points: MapPoint[];
  showRoute?: boolean;
  className?: string;
}

// Component to auto-center the map when points change
const ChangeView: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
};

export const Map: React.FC<MapProps> = ({ points, showRoute = false, className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner border border-stone-200" }) => {
  const center: [number, number] = points.length > 0 
    ? [points[0].lat, points[0].lng] 
    : [41.9028, 12.4964]; // Default to Rome, Italy

  const routePoints: [number, number][] = points.map(p => [p.lat, p.lng]);

  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {points.map((point, index) => (
          <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]}>
            <Popup>
              <div className="p-1">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${
                  point.type === 'PICKUP' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {point.type || 'PUNTO'}
                </span>
                <p className="font-medium text-stone-900">{point.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {showRoute && points.length > 1 && (
          <Polyline 
            positions={routePoints} 
            color="#000" 
            weight={3} 
            opacity={0.6} 
            dashArray="10, 10"
          />
        )}

        <ChangeView points={points} />
      </MapContainer>
    </div>
  );
};
