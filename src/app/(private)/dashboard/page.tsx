import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppButtonLink } from "@/components/app-link";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
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
      <PageHeader title={copy.dashboardTitle} description={copy.appRole} />

      <SurfaceCard>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
          {copy.createFamily}
        </Typography>
        <CreateFamilyForm />
      </SurfaceCard>

      {families.length === 0 ? (
        <SurfaceCard sx={{ borderStyle: "dashed", bgcolor: "transparent" }}>
          <Typography color="text.secondary">{copy.noFamilies}</Typography>
        </SurfaceCard>
      ) : null}

      {families.map((family) => (
        <SurfaceCard
          key={family.id}
          sx={{
            transition: "border-color 160ms ease",
            "&:hover": {
              borderColor: "rgba(11, 127, 191, 0.35)",
            },
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Stack sx={{ flexGrow: 1 }} spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {family.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {roleLabels[family.role]} · {family.memberCount} {copy.memberCount} · {family.deviceCount}{" "}
                {copy.deviceCount}
              </Typography>
            </Stack>
            <AppButtonLink href={`/families/${family.id}`}>{copy.openFamily}</AppButtonLink>
          </Stack>
        </SurfaceCard>
      ))}
    </Stack>
  );
}
