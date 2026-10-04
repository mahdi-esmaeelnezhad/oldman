import Stack from "@mui/material/Stack";
import { notFound } from "next/navigation";
import { BackNav } from "@/components/back-nav";
import { PageHeader } from "@/components/page-header";
import { copy, roleLabels } from "@/config/copy";
import { familyIdSchema } from "@/features/families/schemas";
import { FamilyOverview } from "@/features/families/family-overview";
import { canEnrollDevices, canInviteMembers } from "@/server/auth/authorization";
import { requirePageUser } from "@/server/auth/session";
import { getFamilyForUser } from "@/server/families/family-service";
import { listFamilyNotifications } from "@/server/geofencing/geofence-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

async function loadFamily(userId: string, familyId: string) {
  if (!familyIdSchema.safeParse(familyId).success) {
    return null;
  }

  try {
    const [family, notifications] = await Promise.all([
      getFamilyForUser(userId, familyId),
      listFamilyNotifications(userId, familyId),
    ]);
    return { family, notifications };
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
  const data = await loadFamily(user.id, familyId);
  if (!data) {
    notFound();
  }

  const { family, notifications } = data;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <BackNav href="/dashboard" label={copy.backToDashboard} />
        <PageHeader title={family.name} description={roleLabels[family.role]} />
      </Stack>
      <FamilyOverview
        familyId={family.id}
        currentUserEmail={user.email}
        canInvite={canInviteMembers(family.role)}
        canEnroll={canEnrollDevices(family.role)}
        members={family.members}
        devices={family.devices}
        initialNotifications={notifications}
      />
    </Stack>
  );
}
