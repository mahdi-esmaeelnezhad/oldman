import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppTextLink } from "@/components/app-link";
import { getI18n } from "@/i18n/server";
import { ContactsManager } from "@/features/contacts/contacts-manager";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requirePageUser } from "@/server/auth/session";
import { listRecentContactCommands } from "@/server/commands/command-service";
import { getDeviceContactsPage } from "@/server/contacts/contact-service";
import { AppError } from "@/server/http/api-error";

type PageProps = {
  params: Promise<{ familyId: string; deviceId: string }>;
  searchParams: Promise<{ q?: string }>;
};

async function loadPage(userId: string, familyId: string, deviceId: string, search?: string) {
  if (!familyIdSchema.safeParse(familyId).success || !deviceIdSchema.safeParse(deviceId).success) {
    return null;
  }

  try {
    const [page, commands] = await Promise.all([
      getDeviceContactsPage(userId, familyId, deviceId, search),
      listRecentContactCommands(userId, familyId, deviceId),
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

export default async function DeviceContactsPage({ params, searchParams }: PageProps) {
  const user = await requirePageUser();
  const { familyId, deviceId } = await params;
  const { q } = await searchParams;
  const data = await loadPage(user.id, familyId, deviceId, q);
  if (!data) {
    notFound();
  }

  const { copy } = await getI18n();

  return (
    <Stack spacing={2}>
      <AppTextLink href={`/families/${familyId}/devices/${deviceId}`}>{copy.deviceDashboardTitle}</AppTextLink>
      <Typography variant="h4" component="h1">
        {copy.contactsTitle}
      </Typography>
      <ContactsManager
        key={`${data.page.contacts.map((contact) => contact.contactId).join(",")}:${data.commands
          .map((command) => `${command.id}:${command.status}`)
          .join(",")}`}
        familyId={familyId}
        deviceId={deviceId}
        canManage={data.page.canManage}
        capabilities={data.page.capabilities}
        initialContacts={data.page.contacts}
        initialCommands={data.commands}
        initialSearch={q ?? ""}
      />
    </Stack>
  );
}
