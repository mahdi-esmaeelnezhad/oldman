import Stack from "@mui/material/Stack";
import { notFound } from "next/navigation";
import { AppButtonLink, AppTextLink } from "@/components/app-link";
import { copy } from "@/config/copy";
import { DeviceDashboardLive } from "@/features/devices/device-dashboard-live";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requirePageUser } from "@/server/auth/session";
import { getDeviceForUser } from "@/server/devices/device-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function loadDevice(userId: string, familyId: string, deviceId: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    return await getDeviceForUser(userId, familyId, deviceId);
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

export default async function DeviceDashboardPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const device = await loadDevice(user.id, familyId, deviceId);
  if (!device) {
    notFound();
  }

  return (
    <Stack spacing={2}>
      <AppTextLink href={`/families/${familyId}`}>{copy.backToFamily}</AppTextLink>
      <DeviceDashboardLive familyId={familyId} device={device} />
      <AppButtonLink href={`/families/${familyId}/devices/${deviceId}/apps`}>{copy.openApps}</AppButtonLink>
      <AppButtonLink href={`/families/${familyId}/devices/${deviceId}/location`}>{copy.openLocation}</AppButtonLink>
      <AppButtonLink href={`/families/${familyId}/devices/${deviceId}/contacts`}>{copy.openContacts}</AppButtonLink>
      <AppButtonLink href={`/families/${familyId}/devices/${deviceId}/settings`}>{copy.openSettings}</AppButtonLink>
      <AppButtonLink href={`/families/${familyId}/devices/${deviceId}/commands`}>{copy.openCommands}</AppButtonLink>
    </Stack>
  );
}
