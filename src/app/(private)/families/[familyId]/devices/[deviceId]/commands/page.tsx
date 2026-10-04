import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppTextLink } from "@/components/app-link";
import { getI18n } from "@/i18n/server";
import { CommandQueuePanel } from "@/features/commands/command-queue-panel";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { canManageDevice, requireFamilyMember } from "@/server/auth/authorization";
import { requirePageUser } from "@/server/auth/session";
import { listRecentDeviceCommands } from "@/server/commands/command-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function loadPage(userId: string, familyId: string, deviceId: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    const [membership, commands] = await Promise.all([
      requireFamilyMember(userId, familyId),
      listRecentDeviceCommands(userId, familyId, deviceId),
    ]);
    return {
      canManage: canManageDevice(membership.role),
      commands,
    };
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

export default async function DeviceCommandsPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const data = await loadPage(user.id, familyId, deviceId);
  if (!data) {
    notFound();
  }

  const { copy } = await getI18n();

  return (
    <Stack spacing={2}>
      <AppTextLink href={`/families/${familyId}/devices/${deviceId}`}>{copy.deviceDashboardTitle}</AppTextLink>
      <Typography variant="h4" component="h1">
        {copy.commandsTitle}
      </Typography>
      <CommandQueuePanel
        familyId={familyId}
        deviceId={deviceId}
        canManage={data.canManage}
        initialCommands={data.commands}
      />
    </Stack>
  );
}
