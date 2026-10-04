"use client";

import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/i18n-provider";

export function RegisterForm() {
  const { copy, messageForApiError } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Stack component="form" method="post" spacing={1.5} onSubmit={onSubmit}>
      <Stack spacing={0.4} sx={{ mb: 0.25 }}>
        <Typography
          component="h1"
          sx={{ m: 0, fontWeight: 500, fontSize: { xs: "1.2rem", sm: "1.3rem" }, lineHeight: 1.35 }}
        >
          {copy.welcomeCreate}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {copy.authWelcomeLead}
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ py: 0.35 }}>
          {error}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1.25}>
        <TextField
          name="firstName"
          label={copy.firstName}
          required
          autoComplete="given-name"
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <PersonOutlineOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField name="lastName" label={copy.lastName} required autoComplete="family-name" size="small" />
      </Stack>
      <TextField
        name="email"
        type="email"
        label={copy.email}
        required
        autoComplete="email"
        size="small"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <EmailOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        name="password"
        type="password"
        label={copy.password}
        required
        autoComplete="new-password"
        size="small"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <LockOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth sx={{ py: 1.15 }}>
        {copy.submitRegister}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
        {copy.hasAccount}{" "}
        <Link component={NextLink} href="/login" underline="hover" sx={{ fontWeight: 500 }}>
          {copy.loginTitle}
        </Link>
      </Typography>
    </Stack>
  );
}
