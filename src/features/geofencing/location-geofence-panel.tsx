"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { SurfaceCard } from "@/components/surface-card";
import { messageForApiError } from "@/config/api-errors";
import {
  copy,
  geofenceEventLabels,
  locationPermissionLabels,
  locationServiceLabels,
} from "@/config/copy";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import { formatDateTime } from "@/lib/format-date-time";
import type {
  DeviceLocationView,
  FamilyNotificationView,
  GeofenceView,
} from "@/server/geofencing/geofence-service";

const GeofenceMap = dynamic(
  () => import("@/features/geofencing/geofence-map").then((module) => module.GeofenceMap),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          height: 320,
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(11,127,191,0.04)",
          color: "text.secondary",
          fontSize: "0.875rem",
        }}
      >
        {copy.loadingMap}
      </Box>
    ),
  },
);

type LocationGeofencePanelProps = {
  familyId: string;
  deviceId: string;
  location: DeviceLocationView;
  initialGeofences: GeofenceView[];
  initialNotifications: FamilyNotificationView[];
};

type DraftGeofence = {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
};

const defaultCenter = { latitude: 35.6892, longitude: 51.389 };

export function LocationGeofencePanel({
  familyId,
  deviceId,
  location,
  initialGeofences,
  initialNotifications,
}: LocationGeofencePanelProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [geofences, setGeofences] = useState(initialGeofences);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [locationState, setLocationState] = useState(location);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ label: string; latitude: number; longitude: number }>>(
    [],
  );
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [flyTo, setFlyTo] = useState<{ latitude: number; longitude: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftGeofence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeofenceView | null>(null);

  useFamilyRealtime({
    familyId,
    deviceId,
    onEvent: (event) => {
      if (event.type === "GeofenceEvent") {
        setGeofences((current) =>
          current.map((item) =>
            item.id === event.geofenceId
              ? {
                  ...item,
                  lastEventType: event.eventType,
                  lastEventAt: event.occurredAt,
                }
              : item,
          ),
        );
        if (event.notificationId && event.title) {
          setNotifications((current) => [
            {
              id: event.notificationId as string,
              familyId: event.familyId,
              deviceId: event.deviceId,
              geofenceId: event.geofenceId,
              type: event.eventType === "ENTERED" ? "GEOFENCE_ENTERED" : "GEOFENCE_EXITED",
              title: event.title as string,
              body: event.title as string,
              createdAt: event.occurredAt,
              readAt: null,
            },
            ...current.filter((item) => item.id !== event.notificationId),
          ]);
        }
        return;
      }

      if (event.type === "DeviceEvent" && event.kind === "LOCATION_UPDATED") {
        const latitude =
          typeof event.data?.latitude === "number" ? event.data.latitude : locationState.latitude;
        const longitude =
          typeof event.data?.longitude === "number" ? event.data.longitude : locationState.longitude;
        setLocationState((current) => ({
          ...current,
          latitude,
          longitude,
          lastLocationAt: event.at,
          available: latitude !== null && longitude !== null,
        }));
      }
    },
  });

  const mapCenter = useMemo(() => {
    if (locationState.latitude !== null && locationState.longitude !== null) {
      return { latitude: locationState.latitude, longitude: locationState.longitude };
    }
    if (draft) {
      return { latitude: draft.latitude, longitude: draft.longitude };
    }
    return defaultCenter;
  }, [draft, locationState.latitude, locationState.longitude]);

  const locationServiceLabel =
    locationState.locationServiceEnabled === null
      ? locationServiceLabels.unknown
      : locationState.locationServiceEnabled
        ? locationServiceLabels.true
        : locationServiceLabels.false;

  function openCreate() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchAttempted(false);
    setFlyTo(mapCenter);
    setDraft({
      name: "",
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      radiusMeters: 500,
      enabled: true,
    });
    setEditorOpen(true);
  }

  function openEdit(geofence: GeofenceView) {
    setSearchQuery("");
    setSearchResults([]);
    setSearchAttempted(false);
    setFlyTo({ latitude: geofence.latitude, longitude: geofence.longitude });
    setDraft({
      id: geofence.id,
      name: geofence.name,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radiusMeters: geofence.radiusMeters,
      enabled: geofence.enabled,
    });
    setEditorOpen(true);
  }

  async function searchLocation() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setError(messageForApiError("VALIDATION_ERROR"));
      return;
    }
    setError(null);
    setSearching(true);
    setSearchAttempted(true);
    const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
    setSearching(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      setSearchResults([]);
      return;
    }
    const body = (await response.json()) as {
      results: Array<{ label: string; latitude: number; longitude: number }>;
    };
    setSearchResults(body.results);
  }

  function pickSearchResult(result: { label: string; latitude: number; longitude: number }) {
    if (!draft) {
      return;
    }
    setDraft({
      ...draft,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setFlyTo({ latitude: result.latitude, longitude: result.longitude });
    setSearchResults([]);
    setSearchQuery(result.label);
    setSearchAttempted(false);
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) {
      setError(messageForApiError("VALIDATION_ERROR"));
      return;
    }

    setPending(true);
    setError(null);
    const isEdit = Boolean(draft.id);
    const response = await fetch(
      isEdit
        ? `/api/families/${familyId}/devices/${deviceId}/geofences/${draft.id}`
        : `/api/families/${familyId}/devices/${deviceId}/geofences`,
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          latitude: draft.latitude,
          longitude: draft.longitude,
          radiusMeters: draft.radiusMeters,
          enabled: draft.enabled,
        }),
      },
    );
    setPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }

    const body = (await response.json()) as { geofence: GeofenceView };
    setGeofences((current) => {
      const without = current.filter((item) => item.id !== body.geofence.id);
      return [...without, body.geofence].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    setEditorOpen(false);
    setDraft(null);
    router.refresh();
  }

  async function toggleEnabled(geofence: GeofenceView) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/families/${familyId}/devices/${deviceId}/geofences/${geofence.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !geofence.enabled }),
    });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }
    const body = (await response.json()) as { geofence: GeofenceView };
    setGeofences((current) => current.map((item) => (item.id === body.geofence.id ? body.geofence : item)));
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(
      `/api/families/${familyId}/devices/${deviceId}/geofences/${deleteTarget.id}`,
      { method: "DELETE" },
    );
    setPending(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }
    setGeofences((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
    router.refresh();
  }

  async function markRead(notificationId: string) {
    const response = await fetch(`/api/families/${familyId}/notifications/${notificationId}/read`, {
      method: "POST",
    });
    if (!response.ok) {
      return;
    }
    const body = (await response.json()) as { notification: FamilyNotificationView };
    setNotifications((current) =>
      current.map((item) => (item.id === body.notification.id ? body.notification : item)),
    );
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <SurfaceCard>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {copy.currentLocation}:{" "}
          {locationState.available && locationState.latitude !== null && locationState.longitude !== null
            ? `${locationState.latitude.toFixed(5)}, ${locationState.longitude.toFixed(5)}`
            : copy.valueUnknown}
          {" · "}
          {copy.lastLocationUpdate}:{" "}
          {locationState.lastLocationAt
            ? formatDateTime(new Date(locationState.lastLocationAt))
            : copy.neverSeen}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {locationPermissionLabels[locationState.locationPermission]} · {locationServiceLabel}
        </Typography>
        <Box
          sx={{
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            minHeight: 240,
          }}
        >
          <GeofenceMap
            center={mapCenter}
            geofences={geofences}
            deviceLocation={
              locationState.latitude !== null && locationState.longitude !== null
                ? { latitude: locationState.latitude, longitude: locationState.longitude }
                : null
            }
            selected={
              draft && editorOpen
                ? { latitude: draft.latitude, longitude: draft.longitude }
                : null
            }
            radiusMeters={draft?.radiusMeters ?? 300}
            onSelect={(latitude, longitude) => {
              if (!locationState.canManage) {
                return;
              }
              if (!editorOpen) {
                setSearchQuery("");
                setSearchResults([]);
                setSearchAttempted(false);
                setFlyTo({ latitude, longitude });
                setDraft({
                  name: "",
                  latitude,
                  longitude,
                  radiusMeters: 300,
                  enabled: true,
                });
                setEditorOpen(true);
              }
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {copy.mapAttribution}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: "center" }}>
          {copy.tapMapHint}
        </Typography>
      </SurfaceCard>

      <SurfaceCard>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {copy.geofencesTitle}
          </Typography>
          {locationState.canManage ? (
            <Button variant="contained" onClick={openCreate} disabled={pending}>
              + {copy.createGeofence}
            </Button>
          ) : null}
        </Stack>
        {geofences.length === 0 ? <Typography color="text.secondary">{copy.geofencesEmpty}</Typography> : null}
        <Stack spacing={0} divider={<Divider flexItem />}>
          {geofences.map((geofence) => (
            <Stack
              key={geofence.id}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", py: 1.25 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "rgba(11,127,191,0.1)",
                  color: "primary.main",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{ fontWeight: 500, cursor: locationState.canManage ? "pointer" : "default"  }}
                  onClick={() => locationState.canManage && openEdit(geofence)}
                >
                  {geofence.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.radiusMeters}: {geofence.radiusMeters} ·{" "}
                  {geofence.enabled ? copy.enabled : copy.disabled}
                  {geofence.lastEventType
                    ? ` · ${geofenceEventLabels[geofence.lastEventType]}`
                    : ""}
                </Typography>
              </Box>
              {locationState.canManage ? (
                <>
                  <Switch
                    checked={geofence.enabled}
                    disabled={pending}
                    onChange={() => toggleEnabled(geofence)}
                    slotProps={{ input: { "aria-label": geofence.name } }}
                  />
                  <IconButton
                    color="error"
                    disabled={pending}
                    onClick={() => setDeleteTarget(geofence)}
                    aria-label={copy.deleteGeofence}
                  >
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </SurfaceCard>

      <SurfaceCard>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 500 }}>
          {copy.notificationsTitle}
        </Typography>
        {notifications.length === 0 ? (
          <Typography color="text.secondary">{copy.notificationsEmpty}</Typography>
        ) : null}
        <Stack spacing={0} divider={<Divider flexItem />}>
          {notifications.map((notification) => (
            <Stack key={notification.id} spacing={0.5} sx={{ py: 1.25 }}>
              <Typography sx={{ fontWeight: 500 }}>{notification.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(new Date(notification.createdAt))}
              </Typography>
              {!notification.readAt ? (
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => markRead(notification.id)}>
                  {copy.markRead}
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </SurfaceCard>

      <ResponsiveSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={draft?.id ? copy.editGeofence : copy.createGeofence}
        maxWidth="sm"
        actions={
          <>
            <Button fullWidth={isMobile} onClick={() => setEditorOpen(false)}>
              {copy.cancelAction}
            </Button>
            <Button fullWidth={isMobile} variant="contained" disabled={pending} onClick={saveDraft}>
              {copy.saveGeofence}
            </Button>
          </>
        }
      >
        {draft ? (
          <Stack spacing={2} sx={{ pt: { xs: 0, sm: 1 } }}>
            <TextField
              label={copy.geofenceName}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              required
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label={copy.searchLocation}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchAttempted(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchLocation();
                  }
                }}
                fullWidth
              />
              <Button variant="outlined" onClick={() => void searchLocation()} disabled={searching}>
                {searching ? copy.searchingLocation : copy.searchAction}
              </Button>
            </Stack>
            {searchResults.length > 0 ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {copy.searchPickResult}
                </Typography>
                {searchResults.map((result) => (
                  <Button
                    key={`${result.latitude}-${result.longitude}-${result.label}`}
                    variant="outlined"
                    size="small"
                    onClick={() => pickSearchResult(result)}
                    sx={{
                      justifyContent: "flex-start",
                      textAlign: "start",
                      borderRadius: 1,
                      fontWeight: 400,
                      whiteSpace: "normal",
                      height: "auto",
                      py: 1,
                    }}
                  >
                    {result.label}
                  </Button>
                ))}
              </Stack>
            ) : null}
            {searchAttempted && !searching && searchResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {copy.searchNoResults}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              {copy.drawAreaHint}
            </Typography>
            <Box
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <GeofenceMap
                center={{ latitude: draft.latitude, longitude: draft.longitude }}
                flyTo={flyTo}
                selected={{ latitude: draft.latitude, longitude: draft.longitude }}
                radiusMeters={draft.radiusMeters}
                drawMode
                height={isMobile ? 220 : 280}
                onAreaChange={(area) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          latitude: area.latitude,
                          longitude: area.longitude,
                          radiusMeters: area.radiusMeters,
                        }
                      : current,
                  )
                }
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {copy.drawnRadiusLabel}: {draft.radiusMeters} {copy.metersUnit}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label={copy.latitude}
                type="number"
                value={draft.latitude}
                onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })}
              />
              <TextField
                label={copy.longitude}
                type="number"
                value={draft.longitude}
                onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })}
              />
              <TextField
                label={copy.radiusMeters}
                type="number"
                value={draft.radiusMeters}
                onChange={(event) =>
                  setDraft({ ...draft, radiusMeters: Number(event.target.value) })
                }
              />
            </Stack>
          </Stack>
        ) : null}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={copy.deleteGeofence}
        maxWidth="xs"
        actions={
          <>
            <Button fullWidth={isMobile} onClick={() => setDeleteTarget(null)}>
              {copy.cancelAction}
            </Button>
            <Button
              fullWidth={isMobile}
              color="error"
              variant="contained"
              disabled={pending}
              onClick={confirmDelete}
            >
              {copy.deleteGeofence}
            </Button>
          </>
        }
      >
        <Typography sx={{ pt: { xs: 0, sm: 1 } }}>
          {deleteTarget ? deleteTarget.name : ""} — {copy.confirmAction}?
        </Typography>
      </ResponsiveSheet>
    </Stack>
  );
}
