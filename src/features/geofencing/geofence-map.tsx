"use client";

import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type MapClickHandlerProps = {
  onSelect: (latitude: number, longitude: number) => void;
};

function MapClickHandler({ onSelect }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type GeofenceMapProps = {
  center: { latitude: number; longitude: number };
  selected: { latitude: number; longitude: number } | null;
  radiusMeters: number;
  onSelect: (latitude: number, longitude: number) => void;
};

export function GeofenceMap({ center, selected, radiusMeters, onSelect }: GeofenceMapProps) {
  const mapCenter: LatLngExpression = [center.latitude, center.longitude];
  const selectedPosition: LatLngExpression | null = selected
    ? [selected.latitude, selected.longitude]
    : null;

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: 320, width: "100%", borderRadius: 12 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onSelect={onSelect} />
      {selectedPosition ? (
        <>
          <Marker position={selectedPosition} icon={markerIcon} />
          <Circle
            center={selectedPosition}
            radius={radiusMeters}
            pathOptions={{ color: "#20AFEC", fillColor: "#20AFEC", fillOpacity: 0.2 }}
          />
        </>
      ) : null}
    </MapContainer>
  );
}
