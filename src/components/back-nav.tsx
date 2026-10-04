"use client";

import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import Button from "@mui/material/Button";
import NextLink from "next/link";

type BackNavProps = {
  href: string;
  label: string;
};

/** RTL back control: chevron + label, flat and compact. */
export function BackNav({ href, label }: BackNavProps) {
  return (
    <Button
      component={NextLink}
      href={href}
      variant="text"
      size="small"
      startIcon={<ChevronRightOutlinedIcon />}
      sx={{
        alignSelf: "flex-start",
        px: 0.5,
        py: 0.25,
        minWidth: 0,
        color: "text.secondary",
        fontWeight: 500,
        "& .MuiButton-startIcon": { marginInlineEnd: 0.25 },
      }}
    >
      {label}
    </Button>
  );
}
