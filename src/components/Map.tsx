import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup as LeafletPopup, Polyline as LeafletPolyline, useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APIProvider, Map as GMap, AdvancedMarker, InfoWindow, useMap as useGMap } from '@vis.gl/react-google-maps';

// Fix for default marker icon in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (typeof L !== 'undefined' && L.Icon) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

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

// Custom icon for numbered markers (Leaflet)
const createNumberedIcon = (number: number, type?: 'PICKUP' | 'DELIVERY') => {
  try {
    const color = type === 'PICKUP' ? '#f59e0b' : '#3b82f6';
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
    return new L.Icon.Default();
  }
};

// --- LEAFLET COMPONENTS ---

const LeafletChangeView: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useLeafletMap();
  
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
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 200);
      } catch (error) {
        console.error("[Map] Error updating Leaflet view:", error);
      }
    };

    updateView();
  }, [points, map]);

  return null;
};

const LeafletMap: React.FC<MapProps> = ({ points, showRoute, className }) => {
  const center: [number, number] = React.useMemo(() => {
    if (points.length > 0 && points[0].lat && points[0].lng) {
      return [points[0].lat, points[0].lng];
    }
    return [41.9028, 12.4964];
  }, [points]);

  const routePoints: [number, number][] = React.useMemo(() => 
    points.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng] as [number, number]), 
    [points]
  );

  const markers = React.useMemo(() => {
    return points
      .filter(p => p.lat && p.lng)
      .map((point, index) => (
        <LeafletMarker 
          key={`${point.lat}-${point.lng}-${index}`} 
          position={[point.lat, point.lng]}
          icon={createNumberedIcon(index + 1, point.type)}
        >
          <LeafletPopup>
            <div className="p-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${
                point.type === 'PICKUP' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {index + 1}. {point.type || 'PUNTO'}
              </span>
              <p className="font-medium text-stone-900 text-sm">{point.label}</p>
            </div>
          </LeafletPopup>
        </LeafletMarker>
      ));
  }, [points]);

  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        key="leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers}
        {showRoute && routePoints.length > 1 && (
          <LeafletPolyline 
            positions={routePoints} 
            color="#000" 
            weight={3} 
            opacity={0.6} 
            dashArray="10, 10"
          />
        )}
        <LeafletChangeView points={points} />
      </MapContainer>
    </div>
  );
};

// --- GOOGLE MAPS COMPONENTS ---

const GoogleChangeView: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useGMap();
  
  useEffect(() => {
    if (!map || points.length === 0) return;

    try {
      if (points.length === 1) {
        map.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.setZoom(15);
      } else {
        const bounds = new google.maps.LatLngBounds();
        points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 50);
      }
    } catch (error) {
      console.error("[Map] Error updating Google view:", error);
    }
  }, [points, map]);

  return null;
};

const GoogleMap: React.FC<MapProps> = ({ points, showRoute, className }) => {
  const [openPopupIndex, setOpenPopupIndex] = useState<number | null>(null);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const map = useGMap();

  useEffect(() => {
    if (!map || !showRoute || points.length < 2) {
      if (polyline) {
        polyline.setMap(null);
        setPolyline(null);
      }
      return;
    }

    const path = points.filter(p => p.lat && p.lng).map(p => ({ lat: p.lat, lng: p.lng }));
    
    if (polyline) {
      polyline.setPath(path);
    } else {
      const newPolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#000000',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
          offset: '0',
          repeat: '20px'
        }],
        map: map
      });
      setPolyline(newPolyline);
    }

    return () => {
      if (polyline) polyline.setMap(null);
    };
  }, [map, points, showRoute]);

  const center = points.length > 0 && points[0].lat && points[0].lng
    ? { lat: points[0].lat, lng: points[0].lng }
    : { lat: 41.9028, lng: 12.4964 };

  return (
    <div className={className}>
      <GMap
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        mapId="DEMO_MAP_ID"
      >
        {points.filter(p => p.lat && p.lng).map((point, index) => (
          <React.Fragment key={`${point.lat}-${point.lng}-${index}`}>
            <AdvancedMarker
              position={{ lat: point.lat, lng: point.lng }}
              onClick={() => setOpenPopupIndex(index)}
            >
              <div style={{
                backgroundColor: point.type === 'PICKUP' ? '#f59e0b' : '#3b82f6',
                width: '30px',
                height: '30px',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <div style={{ transform: 'rotate(45deg)', color: 'white', fontWeight: 'bold', fontSize: '12px', fontFamily: 'sans-serif' }}>
                  {index + 1}
                </div>
              </div>
            </AdvancedMarker>
            
            {openPopupIndex === index && (
              <InfoWindow
                position={{ lat: point.lat, lng: point.lng }}
                onCloseClick={() => setOpenPopupIndex(null)}
              >
                <div className="p-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${
                    point.type === 'PICKUP' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}. {point.type || 'PUNTO'}
                  </span>
                  <p className="font-medium text-stone-900 text-sm">{point.label}</p>
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        ))}
        <GoogleChangeView points={points} />
      </GMap>
    </div>
  );
};

export const Map = React.memo<MapProps>((props) => {
  if (GOOGLE_MAPS_API_KEY) {
    return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap {...props} />
      </APIProvider>
    );
  }

  return <LeafletMap {...props} />;
});
