import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { AppBrandLink } from "@/components/app-link";
import { brand } from "@/config/brand";
import { LogoutButton } from "@/features/auth/logout-button";
import type { PublicUser } from "@/server/users/public-user";

type AppShellProps = {
  user: PublicUser;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const initial = (user.firstName || user.email).slice(0, 1);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
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
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 60 } }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              background: brand.gradient,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <FavoriteRoundedIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <AppBrandLink href="/dashboard">{brand.name}</AppBrandLink>
          <Box sx={{ flexGrow: 1 }} />
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: "rgba(11,127,191,0.12)",
              color: "primary.dark",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            {initial}
          </Avatar>
          <Typography variant="body2" noWrap sx={{ display: { xs: "none", sm: "block" }, maxWidth: 160 }}>
            {user.firstName} {user.lastName}
          </Typography>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
