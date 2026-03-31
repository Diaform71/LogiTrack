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

// Custom icon for numbered markers
const createNumberedIcon = (number: number, type?: 'PICKUP' | 'DELIVERY') => {
  try {
    const color = type === 'PICKUP' ? '#f59e0b' : '#3b82f6'; // Amber-500 or Blue-500
    
    // Use single line for HTML to avoid potential issues with newlines in some mobile browsers
    const html = `<div style="background-color:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"><div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:12px;font-family:sans-serif;">${number}</div></div>`;

    return L.divIcon({
      className: 'custom-div-icon',
      html: html,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
  } catch (error) {
    console.error("[Map] Error creating icon:", error);
    return new L.Icon.Default(); // Fallback to default icon
  }
};

// Component to auto-center the map when points change
const ChangeView: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || points.length === 0) return;

    const updateView = () => {
      try {
        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], 15);
        } else {
          const validPoints = points.filter(p => p.lat && p.lng);
          if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
        
        // Ensure size is correct after a short delay to allow for container animations
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 200);
      } catch (error) {
        console.error("[Map] Error updating view:", error);
      }
    };

    updateView();
  }, [points, map]);

  return null;
};

export const Map = React.memo<MapProps>(({ points, showRoute = false, className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner border border-stone-200" }) => {
  console.log(`[Map] Rendering with ${points.length} points`);

  const center: [number, number] = React.useMemo(() => {
    if (points.length > 0 && points[0].lat && points[0].lng) {
      return [points[0].lat, points[0].lng];
    }
    return [41.9028, 12.4964]; // Default to Rome, Italy
  }, [points]);

  const routePoints: [number, number][] = React.useMemo(() => 
    points.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng] as [number, number]), 
    [points]
  );

  const markers = React.useMemo(() => {
    return points
      .filter(p => p.lat && p.lng)
      .map((point, index) => (
        <Marker 
          key={`${point.lat}-${point.lng}-${index}`} 
          position={[point.lat, point.lng]}
          icon={createNumberedIcon(index + 1, point.type)}
        >
          <Popup>
            <div className="p-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${
                point.type === 'PICKUP' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {index + 1}. {point.type || 'PUNTO'}
              </span>
              <p className="font-medium text-stone-900 text-sm">{point.label}</p>
            </div>
          </Popup>
        </Marker>
      ));
  }, [points]);

  // If no valid points, show a placeholder or empty map
  const hasValidPoints = points.some(p => p.lat && p.lng);

  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        // Use a stable key for the container to avoid unnecessary remounts
        key="map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers}

        {showRoute && routePoints.length > 1 && (
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
});
