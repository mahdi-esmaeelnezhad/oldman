import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ChipProps } from "@mui/material/Chip";
import { notFound } from "next/navigation";
import { AppButtonLink } from "@/components/app-link";
import { copy, deviceStatusLabels, platformLabels, roleLabels } from "@/config/copy";
import { EnrollmentPanel } from "@/features/enrollment/enrollment-panel";
import { familyIdSchema } from "@/features/families/schemas";
import { InviteMemberForm } from "@/features/families/invite-member-form";
import { formatDateTime } from "@/lib/format-date-time";
import { canEnrollDevices, canInviteMembers } from "@/server/auth/authorization";
import { requirePageUser } from "@/server/auth/session";
import { getFamilyForUser } from "@/server/families/family-service";
import { AppError } from "@/server/http/api-error";
import type { DeviceStatus } from "@/generated/prisma/enums";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

function deviceStatusColor(status: DeviceStatus): ChipProps["color"] {
  switch (status) {
    case "PENDING":
      return "warning";
    case "ONLINE":
      return "success";
    case "OFFLINE":
      return "default";
    case "DISABLED":
      return "error";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled device status: ${String(exhaustive)}`);
    }
  }
}

async function loadFamily(userId: string, familyId: string) {
  if (!familyIdSchema.safeParse(familyId).success) {
    return null;
  }

  try {
    return await getFamilyForUser(userId, familyId);
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === "FAMILY_NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

export default async function FamilyPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { familyId } = await params;
  const family = await loadFamily(user.id, familyId);
  if (!family) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        {family.name}
      </Typography>
      <Chip label={roleLabels[family.role]} color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">{copy.members}</Typography>
        {family.members.length === 0 ? <Typography color="text.secondary">{copy.noMembers}</Typography> : null}
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {family.members.map((member) => (
            <Stack key={member.id} direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Stack sx={{ minWidth: 0 }}>
                <Typography noWrap>
                  {member.firstName} {member.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {member.email}
                </Typography>
              </Stack>
              <Chip label={roleLabels[member.role]} size="small" />
            </Stack>
          ))}
        </Stack>
        {canInviteMembers(family.role) ? (
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            <Typography variant="subtitle1">{copy.inviteMember}</Typography>
            <InviteMemberForm familyId={family.id} />
          </Stack>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">{copy.devices}</Typography>
        {family.devices.length === 0 ? <Typography color="text.secondary">{copy.noDevices}</Typography> : null}
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {family.devices.map((device) => (
            <Paper key={device.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Typography>{device.name}</Typography>
                  <Chip label={deviceStatusLabels[device.status]} size="small" color={deviceStatusColor(device.status)} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {platformLabels[device.platform]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.lastSeen}: {device.lastSeenAt ? formatDateTime(new Date(device.lastSeenAt)) : copy.neverSeen}
                </Typography>
                <AppButtonLink href={`/families/${family.id}/devices/${device.id}`}>
                  {copy.openDevice}
                </AppButtonLink>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      {canEnrollDevices(family.role) ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <EnrollmentPanel familyId={family.id} />
        </Paper>
      ) : null}
    </Stack>
  );
}
