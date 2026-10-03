"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  { ssr: false },
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
  const [geofences, setGeofences] = useState(initialGeofences);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [locationState, setLocationState] = useState(location);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ label: string; latitude: number; longitude: number }>>(
    [],
  );
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
    setError(null);
    const response = await fetch(`/api/location/search?q=${encodeURIComponent(searchQuery)}`);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }
    const body = (await response.json()) as {
      results: Array<{ label: string; latitude: number; longitude: number }>;
    };
    setSearchResults(body.results);
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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">{copy.locationTitle}</Typography>
        <Alert severity={locationState.available ? "success" : "warning"} sx={{ mt: 1.5 }}>
          {locationState.available ? copy.locationAvailable : copy.locationUnavailable}
        </Alert>
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography>
            {copy.currentLocation}:{" "}
            {locationState.available && locationState.latitude !== null && locationState.longitude !== null
              ? `${locationState.latitude.toFixed(5)}, ${locationState.longitude.toFixed(5)}`
              : copy.valueUnknown}
          </Typography>
          <Typography>
            {copy.lastLocationUpdate}:{" "}
            {locationState.lastLocationAt
              ? formatDateTime(new Date(locationState.lastLocationAt))
              : copy.neverSeen}
          </Typography>
          <Typography>
            {copy.locationPermission}: {locationPermissionLabels[locationState.locationPermission]}
          </Typography>
          <Typography>
            {copy.locationService}: {locationServiceLabel}
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="h6">{copy.geofencesTitle}</Typography>
          {locationState.canManage ? (
            <Button variant="contained" onClick={openCreate} disabled={pending}>
              {copy.createGeofence}
            </Button>
          ) : null}
        </Stack>
        {geofences.length === 0 ? <Typography color="text.secondary">{copy.geofencesEmpty}</Typography> : null}
        <Stack spacing={1.5}>
          {geofences.map((geofence) => (
            <Paper key={geofence.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography>{geofence.name}</Typography>
                  <Chip
                    size="small"
                    label={geofence.enabled ? copy.enabled : copy.disabled}
                    color={geofence.enabled ? "success" : "default"}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {copy.radiusMeters}: {geofence.radiusMeters}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.lastEvent}:{" "}
                  {geofence.lastEventType ? geofenceEventLabels[geofence.lastEventType] : copy.noEventYet}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.lastEventTime}:{" "}
                  {geofence.lastEventAt ? formatDateTime(new Date(geofence.lastEventAt)) : copy.noEventYet}
                </Typography>
                {locationState.canManage ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" disabled={pending} onClick={() => openEdit(geofence)}>
                      {copy.editGeofence}
                    </Button>
                    <Button size="small" variant="outlined" disabled={pending} onClick={() => toggleEnabled(geofence)}>
                      {geofence.enabled ? copy.disableApp : copy.enableApp}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={pending}
                      onClick={() => setDeleteTarget(geofence)}
                    >
                      {copy.deleteGeofence}
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {copy.notificationsTitle}
        </Typography>
        {notifications.length === 0 ? (
          <Typography color="text.secondary">{copy.notificationsEmpty}</Typography>
        ) : null}
        <Stack spacing={1.5}>
          {notifications.map((notification) => (
            <Paper key={notification.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography>{notification.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(new Date(notification.createdAt))}
              </Typography>
              {!notification.readAt ? (
                <Button size="small" sx={{ mt: 1 }} onClick={() => markRead(notification.id)}>
                  {copy.markRead}
                </Button>
              ) : null}
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{draft?.id ? copy.editGeofence : copy.createGeofence}</DialogTitle>
        <DialogContent>
          {draft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  fullWidth
                />
                <Button variant="outlined" onClick={searchLocation}>
                  {copy.searchAction}
                </Button>
              </Stack>
              {searchResults.length > 0 ? (
                <TextField
                  select
                  label={copy.searchLocation}
                  value=""
                  onChange={(event) => {
                    const selected = searchResults.find((item) => item.label === event.target.value);
                    if (!selected) {
                      return;
                    }
                    setDraft({
                      ...draft,
                      latitude: selected.latitude,
                      longitude: selected.longitude,
                    });
                  }}
                >
                  {searchResults.map((result) => (
                    <MenuItem key={`${result.latitude}-${result.longitude}-${result.label}`} value={result.label}>
                      {result.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              <GeofenceMap
                center={mapCenter}
                selected={{ latitude: draft.latitude, longitude: draft.longitude }}
                radiusMeters={draft.radiusMeters}
                onSelect={(latitude, longitude) => setDraft({ ...draft, latitude, longitude })}
              />
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
                onChange={(event) => setDraft({ ...draft, radiusMeters: Number(event.target.value) })}
              />
              <Button
                variant={draft.enabled ? "contained" : "outlined"}
                onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
              >
                {draft.enabled ? copy.enabled : copy.disabled}
              </Button>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>{copy.cancelAction}</Button>
          <Button variant="contained" disabled={pending} onClick={saveDraft}>
            {copy.saveGeofence}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{copy.deleteGeofence}</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget ? deleteTarget.name : ""} — {copy.confirmAction}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{copy.cancelAction}</Button>
          <Button color="error" variant="contained" disabled={pending} onClick={confirmDelete}>
            {copy.deleteGeofence}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
