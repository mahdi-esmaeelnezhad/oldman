"use client";

import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
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
import { messageForApiError } from "@/config/api-errors";
import { copy } from "@/config/copy";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
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
    <Stack component="form" method="post" spacing={1.75} onSubmit={onSubmit}>
      <Stack spacing={0.4} sx={{ mb: 0.5 }}>
        <Typography
          component="h1"
          sx={{ m: 0, fontWeight: 500, fontSize: { xs: "1.2rem", sm: "1.3rem" }, lineHeight: 1.35 }}
        >
          {copy.welcomeBack}
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
        autoComplete="current-password"
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

      <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth sx={{ py: 1.2, mt: 0.25 }}>
        {copy.submitLogin}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", pt: 0.25 }}>
        {copy.noAccount}{" "}
        <Link component={NextLink} href="/register" underline="hover" sx={{ fontWeight: 500 }}>
          {copy.registerTitle}
        </Link>
      </Typography>
    </Stack>
  );
}
