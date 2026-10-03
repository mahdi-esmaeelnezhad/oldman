"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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
    <Stack component="form" method="post" spacing={2} onSubmit={onSubmit}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField name="email" type="email" label={copy.email} required autoComplete="email" />
      <TextField name="password" type="password" label={copy.password} required autoComplete="current-password" />
      <Button type="submit" variant="contained" disabled={pending}>
        {copy.submitLogin}
      </Button>
      <Link component={NextLink} href="/register">
        {copy.noAccount} {copy.registerTitle}
      </Link>
    </Stack>
  );
}
