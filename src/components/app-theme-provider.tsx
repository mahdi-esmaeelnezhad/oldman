"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { createAppTheme } from "@/config/theme";
import type { LocaleDirection } from "@/i18n/config";

type AppThemeProviderProps = {
  children: ReactNode;
  direction: LocaleDirection;
};

export function AppThemeProvider({ children, direction }: AppThemeProviderProps) {
  const theme = useMemo(() => createAppTheme(direction), [direction]);
  const cacheOptions =
    direction === "rtl"
      ? { key: "muirtl", stylisPlugins: [prefixer, rtlPlugin] }
      : { key: "muiltr" };

  return (
    <AppRouterCacheProvider options={cacheOptions}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
