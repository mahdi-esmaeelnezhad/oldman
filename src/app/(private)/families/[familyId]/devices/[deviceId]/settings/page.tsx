import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppTextLink } from "@/components/app-link";
import { copy } from "@/config/copy";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { SettingsManager } from "@/features/settings/settings-manager";
import { requirePageUser } from "@/server/auth/session";
import { listRecentSettingsCommands } from "@/server/commands/command-service";
import { getDeviceSettingsPage } from "@/server/settings/settings-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function loadPage(userId: string, familyId: string, deviceId: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    const [page, commands] = await Promise.all([
      getDeviceSettingsPage(userId, familyId, deviceId),
      listRecentSettingsCommands(userId, familyId, deviceId),
    ]);
    return { page, commands };
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

export default async function DeviceSettingsPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const data = await loadPage(user.id, familyId, deviceId);
  if (!data) {
    notFound();
  }

  return (
    <Stack spacing={2}>
      <AppTextLink href={`/families/${familyId}/devices/${deviceId}`}>{copy.deviceDashboardTitle}</AppTextLink>
      <Typography variant="h4" component="h1">
        {copy.settingsTitle}
      </Typography>
      <SettingsManager
        key={`${data.page.settings.map((setting) => `${setting.key}:${String(setting.value)}`).join(",")}:${data.commands
          .map((command) => `${command.id}:${command.status}`)
          .join(",")}`}
        familyId={familyId}
        deviceId={deviceId}
        canManage={data.page.canManage}
        capabilities={data.page.capabilities}
        initialSettings={data.page.settings}
        initialCommands={data.commands}
      />
    </Stack>
  );
}
