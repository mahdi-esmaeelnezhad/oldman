import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell lockViewport={false}>
      <RegisterForm />
    </AuthShell>
  );
}
