import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AppBar from "@mui/material/AppBar";
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
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <HomeOutlinedIcon />
          <AppBrandLink href="/dashboard">{brand.name}</AppBrandLink>
          <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
            {user.firstName} {user.lastName}
          </Typography>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
