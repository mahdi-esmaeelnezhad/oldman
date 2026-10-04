"use client";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { ReactNode } from "react";

type AppBrandLinkProps = {
  href: string;
  children: ReactNode;
};

export function AppBrandLink({ href, children }: AppBrandLinkProps) {
  return (
    <Typography
      component={NextLink}
      href={href}
      variant="h6"
      noWrap
      sx={{
        color: "text.primary",
        textDecoration: "none",
        minWidth: 0,
        fontWeight: 500,
      }}
    >
      {children}
    </Typography>
  );
}

type AppButtonLinkProps = {
  href: string;
  children: ReactNode;
};

export function AppButtonLink({ href, children }: AppButtonLinkProps) {
  return (
    <Button component={NextLink} href={href} variant="outlined">
      {children}
    </Button>
  );
}

type AppTextLinkProps = {
  href: string;
  children: ReactNode;
};

export function AppTextLink({ href, children }: AppTextLinkProps) {
  return (
    <Typography
      component={NextLink}
      href={href}
      variant="body2"
      sx={{ color: "primary.main", textDecoration: "none", alignSelf: "flex-start" }}
    >
      {children}
    </Typography>
  );
}
