import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppButtonLink } from "@/components/app-link";
import { copy, roleLabels } from "@/config/copy";
import { CreateFamilyForm } from "@/features/families/create-family-form";
import { requirePageUser } from "@/server/auth/session";
import { listFamiliesForUser } from "@/server/families/family-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const families = await listFamiliesForUser(user.id);

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        {copy.dashboardTitle}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {copy.createFamily}
        </Typography>
        <CreateFamilyForm />
      </Paper>
      {families.length === 0 ? <Typography color="text.secondary">{copy.noFamilies}</Typography> : null}
      {families.map((family) => (
        <Paper key={family.id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Stack sx={{ flexGrow: 1 }} spacing={0.5}>
              <Typography variant="h6">{family.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {roleLabels[family.role]} · {family.memberCount} {copy.memberCount} · {family.deviceCount} {copy.deviceCount}
              </Typography>
            </Stack>
            <AppButtonLink href={`/families/${family.id}`}>{copy.openFamily}</AppButtonLink>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
