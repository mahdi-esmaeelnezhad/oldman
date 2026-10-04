import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import type { ReactNode } from "react";
import { AppBrandLink } from "@/components/app-link";
import { brand } from "@/config/brand";
import { LogoutButton } from "@/features/auth/logout-button";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { getI18n } from "@/i18n/server";
import type { PublicUser } from "@/server/users/public-user";

type AppShellProps = {
  user: PublicUser;
  children: ReactNode;
};

export async function AppShell({ user, children }: AppShellProps) {
  const { brandName } = await getI18n();
  const initial = (user.firstName || user.email).slice(0, 1);

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "text.primary",
          boxShadow: "none",
        }}
      >
        <Toolbar sx={{ gap: 0.75, minHeight: 56, px: 1.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              background: brand.gradient,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <FavoriteRoundedIcon sx={{ fontSize: 15, color: "#fff" }} />
          </Box>
          <AppBrandLink href="/dashboard">{brandName}</AppBrandLink>
          <Box sx={{ flexGrow: 1 }} />
          <LanguageSwitcher />
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: "rgba(11,127,191,0.12)",
              color: "primary.dark",
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {initial}
          </Avatar>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Box sx={{ px: 1.75, py: 2.5 }}>{children}</Box>
    </Box>
  );
}
