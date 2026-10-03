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

export function RegisterForm() {
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
    <Stack component="form" method="post" spacing={2} onSubmit={onSubmit}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField name="firstName" label={copy.firstName} required autoComplete="given-name" />
      <TextField name="lastName" label={copy.lastName} required autoComplete="family-name" />
      <TextField name="email" type="email" label={copy.email} required autoComplete="email" />
      <TextField name="password" type="password" label={copy.password} required autoComplete="new-password" />
      <Button type="submit" variant="contained" disabled={pending}>
        {copy.submitRegister}
      </Button>
      <Link component={NextLink} href="/login">
        {copy.hasAccount} {copy.loginTitle}
      </Link>
    </Stack>
  );
}
