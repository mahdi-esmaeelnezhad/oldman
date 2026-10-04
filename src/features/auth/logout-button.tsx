"use client";

import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import { copy } from "@/config/copy";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Tooltip title={copy.logout}>
      <IconButton
        color="primary"
        size="small"
        onClick={onClick}
        aria-label={copy.logout}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          color: "text.secondary",
          "&:hover": {
            borderColor: "rgba(11, 127, 191, 0.35)",
            bgcolor: "rgba(11, 127, 191, 0.06)",
            color: "primary.main",
          },
        }}
      >
        <LogoutOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
