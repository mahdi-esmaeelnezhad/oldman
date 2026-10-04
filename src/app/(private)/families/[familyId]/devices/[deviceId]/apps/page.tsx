import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { BackNav } from "@/components/back-nav";
import { copy } from "@/config/copy";
import { AppsManager } from "@/features/apps/apps-manager";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { getDeviceAppsPage } from "@/server/apps/app-service";
import { requirePageUser } from "@/server/auth/session";
import { listRecentAppCommands } from "@/server/commands/command-service";
import { getDeviceForUser } from "@/server/devices/device-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function loadPage(userId: string, familyId: string, deviceId: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    const [page, commands, device] = await Promise.all([
      getDeviceAppsPage(userId, familyId, deviceId),
      listRecentAppCommands(userId, familyId, deviceId),
      getDeviceForUser(userId, familyId, deviceId),
    ]);
    return { page, commands, device };
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

export default async function DeviceAppsPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const data = await loadPage(user.id, familyId, deviceId);
  if (!data) {
    notFound();
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <BackNav href={`/families/${familyId}/devices/${deviceId}`} label={copy.backToDevice} />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 500 }}>
            {copy.appsTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.appsSubtitlePrefix} {data.device.name}
          </Typography>
        </Box>
      </Stack>
      <AppsManager
        key={`${data.page.apps.map((app) => app.packageName).join(",")}:${data.commands
          .map((command) => `${command.id}:${command.status}`)
          .join(",")}`}
        familyId={familyId}
        deviceId={deviceId}
        canManage={data.page.canManage}
        capabilities={data.page.capabilities}
        initialApps={data.page.apps}
        initialCatalog={data.page.catalog}
        initialCommands={data.commands}
      />
    </Stack>
  );
}
