"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { messageForApiError } from "@/config/api-errors";
import { copy } from "@/config/copy";
import { locale } from "@/config/locale";

type EnrollmentPanelProps = {
  familyId: string;
};

const dateTimeFormat = new Intl.DateTimeFormat(locale.dateLocale, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function EnrollmentPanel({ familyId }: EnrollmentPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresLabel, setExpiresLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createSession() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/families/${familyId}/enrollments`, { method: "POST" });
    setPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }

    const body = (await response.json()) as { enrollment: { qrDataUrl: string; expiresAt: string } };
    setQrDataUrl(body.enrollment.qrDataUrl);
    setExpiresLabel(dateTimeFormat.format(new Date(body.enrollment.expiresAt)));
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{copy.enrollmentTitle}</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button variant="contained" onClick={createSession} disabled={pending}>
        {copy.createEnrollment}
      </Button>
      {qrDataUrl ? (
        <Box
          component="img"
          src={qrDataUrl}
          alt={copy.enrollmentQrAlt}
          sx={{ width: 280, height: 280, alignSelf: "flex-start", bgcolor: "common.white" }}
        />
      ) : null}
      {expiresLabel ? (
        <Typography variant="body2" color="text.secondary">
          {copy.enrollmentExpires}: {expiresLabel}
        </Typography>
      ) : null}
    </Stack>
  );
}
