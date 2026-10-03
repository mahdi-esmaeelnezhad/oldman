"use client";

import Button from "@mui/material/Button";
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
    <Button color="inherit" onClick={onClick}>
      {copy.logout}
    </Button>
  );
}
