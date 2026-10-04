"use client";

import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/i18n/i18n-provider";

const MIN_RADIUS_METERS = 50;
const MAX_RADIUS_METERS = 50000;

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function clampRadius(meters: number): number {
  return Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, Math.round(meters)));
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  return L.latLng(from.latitude, from.longitude).distanceTo(L.latLng(to.latitude, to.longitude));
}

function edgePointEast(center: { latitude: number; longitude: number }, radiusMeters: number) {
  const earth = 6378137;
  const dLng =
    ((radiusMeters / earth) * (180 / Math.PI)) / Math.cos((center.latitude * Math.PI) / 180);
  return { latitude: center.latitude, longitude: center.longitude + dLng };
}

export type MapGeofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
};

export type MapArea = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type GeofenceMapProps = {
  center: { latitude: number; longitude: number };
  /** When this changes, map flies to the new center (search / open). */
  flyTo?: { latitude: number; longitude: number } | null;
  selected?: { latitude: number; longitude: number } | null;
  radiusMeters?: number;
  geofences?: MapGeofence[];
  deviceLocation?: { latitude: number; longitude: number } | null;
  onSelect?: (latitude: number, longitude: number) => void;
  /** Two-click area definition: first click = center, second click = radius edge. Pan stays enabled. */
  drawMode?: boolean;
  onAreaChange?: (area: MapArea) => void;
  height?: number | string;
};

function FlyToPoint({ target }: { target: { latitude: number; longitude: number } | null | undefined }) {
  const map = useMap();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }
    const key = `${target.latitude.toFixed(6)},${target.longitude.toFixed(6)}`;
    if (lastKey.current === key) {
      return;
    }
    lastKey.current = key;
    map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, target]);

  return null;
}

type DrawHandlerProps = {
  drawMode: boolean;
  selected: { latitude: number; longitude: number } | null;
  radiusMeters: number;
  onAreaChange?: (area: MapArea) => void;
  onSelect?: (latitude: number, longitude: number) => void;
  onPreviewChange: (
    preview: { center: MapArea; edge: { latitude: number; longitude: number } } | null,
  ) => void;
};

/**
 * Pan always stays on. In draw mode:
 * - 1st click sets center
 * - move mouse to preview radius line
 * - 2nd click sets radius
 */
function MapInteraction({
  drawMode,
  selected,
  radiusMeters,
  onAreaChange,
  onSelect,
  onPreviewChange,
}: DrawHandlerProps) {
  const map = useMap();
  const awaitingRadiusRef = useRef(false);
  const centerRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const onAreaChangeRef = useRef(onAreaChange);
  const onPreviewChangeRef = useRef(onPreviewChange);

  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
  }, [onAreaChange]);

  useEffect(() => {
    onPreviewChangeRef.current = onPreviewChange;
  }, [onPreviewChange]);

  useEffect(() => {
    map.dragging.enable();
    if (!drawMode) {
      awaitingRadiusRef.current = false;
      centerRef.current = null;
      onPreviewChangeRef.current(null);
    }
  }, [drawMode, map]);

  useMapEvents({
    click(event) {
      if (!drawMode || !onAreaChangeRef.current) {
        onSelect?.(event.latlng.lat, event.latlng.lng);
        return;
      }

      const point = { latitude: event.latlng.lat, longitude: event.latlng.lng };

      if (!awaitingRadiusRef.current) {
        centerRef.current = point;
        awaitingRadiusRef.current = true;
        const area = { ...point, radiusMeters: Math.max(radiusMeters, MIN_RADIUS_METERS) };
        onAreaChangeRef.current(area);
        onPreviewChangeRef.current({
          center: area,
          edge: edgePointEast(point, area.radiusMeters),
        });
        return;
      }

      const center = centerRef.current ?? selected ?? point;
      const nextRadius = clampRadius(distanceMeters(center, point));
      const area = { ...center, radiusMeters: nextRadius };
      onAreaChangeRef.current(area);
      awaitingRadiusRef.current = false;
      centerRef.current = null;
      onPreviewChangeRef.current(null);
    },
    mousemove(event) {
      if (!drawMode || !awaitingRadiusRef.current || !centerRef.current) {
        return;
      }
      const center = centerRef.current;
      const edge = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      const nextRadius = clampRadius(distanceMeters(center, edge));
      onPreviewChangeRef.current({
        center: { ...center, radiusMeters: nextRadius },
        edge,
      });
    },
  });

  return null;
}

/** Free OpenStreetMap tiles via Leaflet — no API key. */
export function GeofenceMap({
  center,
  flyTo = null,
  selected = null,
  radiusMeters = 300,
  geofences = [],
  deviceLocation = null,
  onSelect,
  drawMode = false,
  onAreaChange,
  height = 320,
}: GeofenceMapProps) {
  const { copy } = useI18n();
  const [drawPreview, setDrawPreview] = useState<{
    center: MapArea;
    edge: { latitude: number; longitude: number };
  } | null>(null);

  const mapCenter: LatLngExpression = [center.latitude, center.longitude];
  const devicePosition: LatLngExpression | null = deviceLocation
    ? [deviceLocation.latitude, deviceLocation.longitude]
    : null;

  const activeCenter =
    drawPreview?.center ??
    (selected
      ? { latitude: selected.latitude, longitude: selected.longitude, radiusMeters }
      : null);

  const radiusLine: LatLngExpression[] | null = drawPreview
    ? [
        [drawPreview.center.latitude, drawPreview.center.longitude],
        [drawPreview.edge.latitude, drawPreview.edge.longitude],
      ]
    : activeCenter
      ? (() => {
          const edge = edgePointEast(activeCenter, activeCenter.radiusMeters);
          return [
            [activeCenter.latitude, activeCenter.longitude] as LatLngExpression,
            [edge.latitude, edge.longitude] as LatLngExpression,
          ];
        })()
      : null;

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{
        height,
        width: "100%",
        borderRadius: 8,
        zIndex: 0,
        cursor: drawMode ? "crosshair" : undefined,
      }}
      scrollWheelZoom
      dragging
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FlyToPoint target={flyTo} />
      <MapInteraction
        drawMode={drawMode}
        selected={selected}
        radiusMeters={radiusMeters}
        onAreaChange={onAreaChange}
        onSelect={onSelect}
        onPreviewChange={setDrawPreview}
      />

      {geofences.map((geofence) => (
        <Circle
          key={geofence.id}
          center={[geofence.latitude, geofence.longitude]}
          radius={geofence.radiusMeters}
          pathOptions={{
            color: geofence.enabled ? "#0B7FBF" : "#8A9AAB",
            fillColor: geofence.enabled ? "#20AFEC" : "#8A9AAB",
            fillOpacity: geofence.enabled ? 0.18 : 0.08,
            dashArray: geofence.enabled ? undefined : "6 6",
            weight: 2,
          }}
        >
          <Popup>{geofence.name}</Popup>
        </Circle>
      ))}

      {devicePosition ? (
        <Marker position={devicePosition} icon={markerIcon}>
          <Popup>{copy.deviceLocationMarker}</Popup>
        </Marker>
      ) : null}

      {activeCenter ? (
        <>
          <Marker position={[activeCenter.latitude, activeCenter.longitude]} icon={markerIcon} />
          <Circle
            center={[activeCenter.latitude, activeCenter.longitude]}
            radius={activeCenter.radiusMeters}
            pathOptions={{ color: "#0B7FBF", fillColor: "#20AFEC", fillOpacity: 0.22, weight: 2 }}
          />
          {radiusLine ? (
            <Polyline
              positions={radiusLine}
              pathOptions={{ color: "#0B7FBF", weight: 2, dashArray: "6 4" }}
            />
          ) : null}
        </>
      ) : null}
    </MapContainer>
  );
}
