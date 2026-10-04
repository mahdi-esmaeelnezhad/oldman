"use client";

import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type MouseEvent } from "react";
import { localeMeta, locales, type AppLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";
import { setLocaleAction } from "@/i18n/set-locale";

const localeShort: Record<AppLocale, string> = {
  fa: "FA",
  en: "EN",
  ar: "AR",
};

export function LanguageSwitcher() {
  const { locale, copy } = useI18n();
  const router = useRouter();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();
  const open = Boolean(anchorEl);
  const label = `${copy.language}: ${localeMeta[locale].nativeLabel}`;

  function openMenu(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function closeMenu() {
    setAnchorEl(null);
  }

  function selectLocale(next: AppLocale) {
    closeMenu();
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          color="primary"
          size="small"
          onClick={openMenu}
          disabled={pending}
          aria-label={label}
          aria-controls={open ? menuId : undefined}
          aria-haspopup="menu"
          aria-expanded={open ? "true" : undefined}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            color: "text.secondary",
            gap: 0.25,
            px: 0.75,
            borderRadius: 1,
            "&:hover": {
              borderColor: "rgba(11, 127, 191, 0.35)",
              bgcolor: "rgba(11, 127, 191, 0.06)",
              color: "primary.main",
            },
          }}
        >
          <TranslateOutlinedIcon sx={{ fontSize: 18 }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            {localeShort[locale]}
          </span>
        </IconButton>
      </Tooltip>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 140,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
            },
          },
        }}
      >
        {locales.map((code) => (
          <MenuItem
            key={code}
            selected={code === locale}
            disabled={pending}
            onClick={() => selectLocale(code)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                component="span"
                variant="caption"
                sx={{ fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary", minWidth: 22 }}
              >
                {localeShort[code]}
              </Typography>
              <Typography component="span" variant="body2">
                {localeMeta[code].nativeLabel}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
