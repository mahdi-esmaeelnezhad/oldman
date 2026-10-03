"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { messageForApiError } from "@/config/api-errors";
import { copy, roleLabels } from "@/config/copy";
import { userRoles } from "@/features/families/schemas";

type InviteMemberFormProps = {
  familyId: string;
};

export function InviteMemberForm({ familyId }: InviteMemberFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const response = await fetch(`/api/families/${familyId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        role: form.get("role"),
      }),
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
    <Stack component="form" method="post" spacing={1.5} onSubmit={onSubmit}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField name="email" type="email" label={copy.inviteEmail} required />
      <TextField name="role" label={copy.role} select defaultValue="CAREGIVER" required>
        {userRoles.map((role) => (
          <MenuItem key={role} value={role}>
            {roleLabels[role]}
          </MenuItem>
        ))}
      </TextField>
      <Button type="submit" variant="contained" disabled={pending}>
        {copy.saveInvite}
      </Button>
    </Stack>
  );
}
