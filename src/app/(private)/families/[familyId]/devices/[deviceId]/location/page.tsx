import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { BackNav } from "@/components/back-nav";
import { localeMeta } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { LocationGeofencePanel } from "@/features/geofencing/location-geofence-panel";
import { formatDateTime } from "@/lib/format-date-time";
import { requirePageUser } from "@/server/auth/session";
import { getDeviceForUser } from "@/server/devices/device-service";
import {
  getDeviceLocation,
  listFamilyNotifications,
  listGeofencesForDevice,
} from "@/server/geofencing/geofence-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function loadPage(userId: string, familyId: string, deviceId: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    const [location, geofences, notifications, device] = await Promise.all([
      getDeviceLocation(userId, familyId, deviceId),
      listGeofencesForDevice(userId, familyId, deviceId),
      listFamilyNotifications(userId, familyId),
      getDeviceForUser(userId, familyId, deviceId),
    ]);
    return { location, geofences, notifications, device };
  } catch (error: unknown) {
    if (
      error instanceof AppError &&
      (error.code === "FAMILY_NOT_FOUND" || error.code === "DEVICE_NOT_FOUND")
    ) {
      return null;
    }

    throw error;
  }
}

export default async function DeviceLocationPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const data = await loadPage(user.id, familyId, deviceId);
  if (!data) {
    notFound();
  }

  const { copy, locale } = await getI18n();
  const { dateLocale } = localeMeta[locale];

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <BackNav href={`/families/${familyId}/devices/${deviceId}`} label={copy.backToDevice} />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 500 }}>
            {copy.openLocation}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.device.name}
            {data.location.lastLocationAt
              ? ` · ${formatDateTime(new Date(data.location.lastLocationAt), dateLocale)}`
              : ""}
          </Typography>
        </Box>
      </Stack>
      <LocationGeofencePanel
        familyId={familyId}
        deviceId={deviceId}
        location={data.location}
        initialGeofences={data.geofences}
        initialNotifications={data.notifications}
      />
    </Stack>
  );
}
