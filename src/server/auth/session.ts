import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, sessionTtlSeconds } from "@/config/session";
import { prisma } from "@/lib/prisma";
import { createSecretToken, hashSecret } from "@/server/auth/secrets";
import { AppError } from "@/server/http/api-error";
import { toPublicUser, type PublicUser } from "@/server/users/public-user";

function sessionExpiry(): Date {
  return new Date(Date.now() + sessionTtlSeconds * 1000);
}

async function writeSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = createSecretToken();
  const expiresAt = sessionExpiry();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSecret(token),
      expiresAt,
    },
  });
  await writeSessionCookie(token, expiresAt);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return toPublicUser(session.user);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  return user;
}

export async function requirePageUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSecret(token) } });
  }

  cookieStore.delete(sessionCookieName);
}
