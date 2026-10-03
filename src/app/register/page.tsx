import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { brand } from "@/config/brand";
import { copy } from "@/config/copy";
import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <Stack sx={{ minHeight: "100vh", justifyContent: "center", px: 2, py: 4 }}>
      <Paper variant="outlined" sx={{ p: 3, width: "100%", maxWidth: 420, mx: "auto" }}>
        <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
          {brand.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {copy.registerTitle}
        </Typography>
        <RegisterForm />
      </Paper>
    </Stack>
  );
}
