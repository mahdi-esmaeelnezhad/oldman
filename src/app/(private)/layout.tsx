import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/server/auth/session";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
