import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { createSecretToken, hashSecret } from "../auth/secrets";

const baseUrl = "http://127.0.0.1:3000";

type ErrorBody = { error?: { code?: string } };

function cookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function request(path: string, init: RequestInit = {}, cookie = ""): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) {
    headers.set("cookie", cookie);
  }

  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

async function expectStatus(response: Response, status: number, label: string): Promise<void> {
  if (response.status !== status) {
    throw new Error(`${label} returned ${response.status}.`);
  }
}

async function main(): Promise<void> {
  const unauthenticated = await request("/api/auth/me");
  await expectStatus(unauthenticated, 401, "Current user without a session");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "Owner@Example.com", password: "demo-password" }),
  });
  await expectStatus(login, 200, "Login");
  const ownerCookie = cookieHeader(login);
  const loginBody = (await login.json()) as { user?: { passwordHash?: string; email?: string } };
  if (!loginBody.user || loginBody.user.email !== "owner@example.com" || "passwordHash" in loginBody.user) {
    throw new Error("Login response exposed a secret or skipped email normalization.");
  }

  const me = await request("/api/auth/me", {}, ownerCookie);
  await expectStatus(me, 200, "Current user");

  const familyName = `Family ${randomUUID()}`;
  const createdFamily = await request(
    "/api/families",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: familyName }),
    },
    ownerCookie,
  );
  await expectStatus(createdFamily, 201, "Create family");
  const familyBody = (await createdFamily.json()) as { family: { id: string } };

  const missingUser = await request(
    `/api/families/${familyBody.family.id}/members`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com", role: "VIEWER" }),
    },
    ownerCookie,
  );
  await expectStatus(missingUser, 404, "Invite missing user");

  const guestEmail = `guest-${randomUUID()}@example.com`;
  const registered = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: guestEmail,
      password: "guest-password",
      firstName: "Guest",
      lastName: "Member",
    }),
  });
  await expectStatus(registered, 201, "Register");
  const guestCookie = cookieHeader(registered);

  const hiddenFamily = await request(`/api/families/${familyBody.family.id}`, {}, guestCookie);
  await expectStatus(hiddenFamily, 404, "Non-member family read");

  const invited = await request(
    `/api/families/${familyBody.family.id}/members`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: guestEmail, role: "CAREGIVER" }),
    },
    ownerCookie,
  );
  await expectStatus(invited, 201, "Invite member");

  const guestView = await request(`/api/families/${familyBody.family.id}/members`, {}, guestCookie);
  await expectStatus(guestView, 200, "Member list");

  const forbiddenInvite = await request(
    `/api/families/${familyBody.family.id}/members`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", role: "VIEWER" }),
    },
    guestCookie,
  );
  await expectStatus(forbiddenInvite, 403, "Non-owner invite");

  const enrollment = await request(`/api/families/${familyBody.family.id}/enrollments`, { method: "POST" }, ownerCookie);
  await expectStatus(enrollment, 201, "Enrollment session");
  const enrollmentBody = (await enrollment.json()) as { enrollment?: { qrDataUrl?: string; token?: string } };
  if (!enrollmentBody.enrollment?.qrDataUrl?.startsWith("data:image/png") || enrollmentBody.enrollment.token) {
    throw new Error("Enrollment response did not return only a QR image.");
  }

  const storedToken = await prisma.enrollmentToken.findFirst({
    where: { familyId: familyBody.family.id },
    orderBy: { createdAt: "desc" },
    select: { tokenHash: true },
  });
  if (!storedToken || storedToken.tokenHash.length !== 64 || enrollmentBody.enrollment.qrDataUrl.includes(storedToken.tokenHash)) {
    throw new Error("Enrollment token was not stored as a hash.");
  }

  const rawToken = createSecretToken();
  const expiresAt = new Date(Date.now() + 60_000);
  await prisma.enrollmentToken.create({
    data: {
      familyId: familyBody.family.id,
      createdBy: loginBody.user.email ? (await prisma.user.findUniqueOrThrow({ where: { email: "owner@example.com" } })).id : "",
      tokenHash: hashSecret(rawToken),
      expiresAt,
    },
  });

  const deviceIdentifier = randomUUID();
  const redeemed = await request("/api/enrollments/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: rawToken,
      deviceIdentifier,
      name: "Enrolled Phone",
      platform: "ANDROID",
    }),
  });
  await expectStatus(redeemed, 201, "Redeem enrollment");

  const replay = await request("/api/enrollments/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: rawToken,
      deviceIdentifier: randomUUID(),
      name: "Replay Phone",
      platform: "ANDROID",
    }),
  });
  await expectStatus(replay, 400, "Replay enrollment token");
  const replayBody = (await replay.json()) as ErrorBody;
  if (replayBody.error?.code !== "ENROLLMENT_TOKEN_INVALID") {
    throw new Error("Replayed token returned the wrong error code.");
  }

  const logout = await request("/api/auth/logout", { method: "POST" }, ownerCookie);
  await expectStatus(logout, 200, "Logout");
  const afterLogout = await request("/api/auth/me", {}, ownerCookie);
  await expectStatus(afterLogout, 401, "Current user after logout");

  console.log(JSON.stringify({ ok: true, family: familyName }));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Sprint 1 verification failed.");
    await prisma.$disconnect();
    process.exit(1);
  });
