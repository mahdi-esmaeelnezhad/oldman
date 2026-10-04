"use client";

import IosShareOutlinedIcon from "@mui/icons-material/IosShareOutlined";
import AddToHomeScreenOutlinedIcon from "@mui/icons-material/AddToHomeScreenOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { copy } from "@/config/copy";

const DISMISS_KEY = "family-care-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return (iOS || iPadOs) && !("MSStream" in window);
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/** iOS Share → Add to Home Screen guide, plus Chromium install prompt when available. */
export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setReady(true);
      return;
    }

    if (typeof window !== "undefined" && window.localStorage.getItem(DISMISS_KEY) === "1") {
      setReady(true);
      return;
    }

    const ios = isIosDevice();
    setIsIos(ios);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setOpen(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS never fires beforeinstallprompt — show the Share guide instead.
    if (ios) {
      setOpen(true);
    }

    setReady(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // Only show Chromium sheet when an install prompt is available (or iOS guide).
  const shouldShow = open && (isIos || deferred !== null);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function installChromium() {
    if (!deferred) {
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!ready || !shouldShow) {
    return null;
  }

  return (
    <ResponsiveSheet
      open={shouldShow}
      onClose={dismiss}
      title={isIos ? copy.installIosTitle : copy.installAppTitle}
      maxWidth="xs"
      actions={
        isIos ? (
          <Button fullWidth variant="contained" onClick={dismiss}>
            {copy.installGotIt}
          </Button>
        ) : (
          <>
            <Button fullWidth onClick={dismiss}>
              {copy.installDismiss}
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddToHomeScreenOutlinedIcon />}
              onClick={() => void installChromium()}
              disabled={!deferred}
            >
              {copy.installAppAction}
            </Button>
          </>
        )
      }
    >
      <Stack spacing={1.5} sx={{ pt: { xs: 0, sm: 1 } }}>
        <Typography variant="body2" color="text.secondary">
          {copy.installAppHint}
        </Typography>

        {isIos ? (
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <IosShareOutlinedIcon color="primary" fontSize="small" sx={{ mt: 0.25 }} />
              <Typography variant="body2">{copy.installIosStepShare}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <AddToHomeScreenOutlinedIcon color="primary" fontSize="small" sx={{ mt: 0.25 }} />
              <Typography variant="body2">{copy.installIosStepAdd}</Typography>
            </Stack>
            <Typography variant="body2">{copy.installIosStepConfirm}</Typography>
          </Stack>
        ) : null}
      </Stack>
    </ResponsiveSheet>
  );
}
