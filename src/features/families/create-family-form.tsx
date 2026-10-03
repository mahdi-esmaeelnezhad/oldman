"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { messageForApiError } from "@/config/api-errors";
import { copy } from "@/config/copy";

export function CreateFamilyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const response = await fetch("/api/families", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <Stack component="form" method="post" direction={{ xs: "column", sm: "row" }} spacing={1} onSubmit={onSubmit}>
      <TextField name="name" label={copy.familyName} required fullWidth />
      <Button type="submit" variant="contained" disabled={pending}>
        {copy.saveFamily}
      </Button>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
