import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppTextLink } from "@/components/app-link";
import { copy } from "@/config/copy";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { LocationGeofencePanel } from "@/features/geofencing/location-geofence-panel";
import { requirePageUser } from "@/server/auth/session";
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
    const [location, geofences, notifications] = await Promise.all([
      getDeviceLocation(userId, familyId, deviceId),
      listGeofencesForDevice(userId, familyId, deviceId),
      listFamilyNotifications(userId, familyId),
    ]);
    return { location, geofences, notifications };
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

  return (
    <Stack spacing={2}>
      <AppTextLink href={`/families/${familyId}/devices/${deviceId}`}>{copy.deviceDashboardTitle}</AppTextLink>
      <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}>
        {copy.openLocation}
      </Typography>
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
