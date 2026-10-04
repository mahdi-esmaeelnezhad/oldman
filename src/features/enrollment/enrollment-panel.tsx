"use client";

import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { useI18n } from "@/i18n/i18n-provider";

type EnrollmentPanelProps = {
  familyId: string;
};

export function EnrollmentPanel({ familyId }: EnrollmentPanelProps) {
  const { copy, dateLocale, messageForApiError } = useI18n();
  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [dateLocale],
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresLabel, setExpiresLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createSession() {
    setPending(true);
    setError(null);
    setCopied(false);
    const response = await fetch(`/api/families/${familyId}/enrollments`, { method: "POST" });
    setPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      setOpen(true);
      return;
    }

    const body = (await response.json()) as {
      enrollment: { qrDataUrl: string; expiresAt: string; code: string };
    };
    setQrDataUrl(body.enrollment.qrDataUrl);
    setCode(body.enrollment.code);
    setExpiresLabel(dateTimeFormat.format(new Date(body.enrollment.expiresAt)));
    setOpen(true);
  }

  async function copyCode() {
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<QrCode2OutlinedIcon />}
        onClick={createSession}
        disabled={pending}
      >
        {copy.createEnrollment}
      </Button>

      <ResponsiveSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.enrollmentTitle}
        maxWidth="xs"
        actions={
          <>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={copyCode}
              disabled={!code}
            >
              {copy.copyEnrollmentCode}
            </Button>
            <Button fullWidth variant="contained" onClick={() => setOpen(false)}>
              {copy.enrollmentDone}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ alignItems: "stretch", pt: { xs: 0, sm: 1 } }}>
          <Typography variant="body2" color="text.secondary">
            {copy.enrollmentHint}
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {qrDataUrl ? (
            <Box
              sx={{
                alignSelf: "center",
                p: 1.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "common.white",
              }}
            >
              <Box
                component="img"
                src={qrDataUrl}
                alt={copy.enrollmentQrAlt}
                sx={{ width: isMobile ? 200 : 220, height: isMobile ? 200 : 220, display: "block" }}
              />
            </Box>
          ) : null}

          {code ? (
            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
              <Typography
                sx={{
                  fontWeight: 500,
                  fontSize: "1.15rem",
                  letterSpacing: "0.06em",
                  color: "primary.main",
                  wordBreak: "break-all",
                  textAlign: "center",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  px: 1,
                }}
              >
                {code}
              </Typography>
              {expiresLabel ? (
                <Typography variant="caption" color="text.secondary">
                  {copy.enrollmentExpires}: {expiresLabel}
                </Typography>
              ) : null}
              {copied ? (
                <Typography variant="caption" color="success.main">
                  {copy.codeCopied}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </ResponsiveSheet>
    </>
  );
}
