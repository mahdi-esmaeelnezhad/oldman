import "dotenv/config";
import { randomUUID } from "node:crypto";

import { prisma } from "../../lib/prisma";
import { toPublicUser } from "../users/public-user";

function errorCodes(error: unknown): string[] {
  if (typeof error !== "object" || error === null) {
    return [];
  }

  const codes: string[] = [];

  if ("code" in error && typeof error.code === "string") {
    codes.push(error.code);
  }

  if ("meta" in error && typeof error.meta === "object" && error.meta !== null && "code" in error.meta) {
    const metaCode = error.meta.code;
    if (typeof metaCode === "string") {
      codes.push(metaCode);
    }
  }

  return codes;
}

async function expectRejection(label: string, codes: string[], action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    const actualCodes = errorCodes(error);
    const matched = actualCodes.some((code) => codes.includes(code));
    if (!matched) {
      throw new Error(`${label} was rejected with unexpected code: ${actualCodes.join(", ") || "none"}.`);
    }
    return;
  }

  throw new Error(`${label} was accepted.`);
}

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;

  const user = await prisma.user.findUnique({
    where: { email: "owner@example.com" },
    include: {
      memberships: {
        include: {
          family: {
            include: {
              devices: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Seed user was not found.");
  }

  const publicUser = toPublicUser(user);
  if ("passwordHash" in publicUser) {
    throw new Error("Public user still exposes passwordHash.");
  }

  if (!user.passwordHash.startsWith("$2")) {
    throw new Error("Stored password is not a bcrypt hash.");
  }

  const membership = user.memberships[0];
  const device = membership?.family.devices[0];

  if (!membership || membership.role !== "OWNER" || membership.family.name !== "Demo Family" || !device) {
    throw new Error("User, family, membership, and device relations did not load.");
  }

  if (device.familyId !== membership.familyId || device.platform !== "ANDROID" || device.status !== "PENDING") {
    throw new Error("Device relation does not match the seeded family.");
  }

  await expectRejection("Duplicate email", ["P2002"], () =>
    prisma.user.create({
      data: {
        email: user.email,
        passwordHash: "rejected-before-persist",
        firstName: "Dup",
        lastName: "User",
      },
    }),
  );

  await expectRejection("Duplicate family membership", ["P2002"], () =>
    prisma.familyMember.create({
      data: {
        familyId: membership.familyId,
        userId: user.id,
        role: "VIEWER",
      },
    }),
  );

  await expectRejection("Duplicate device identifier", ["P2002"], () =>
    prisma.device.create({
      data: {
        familyId: membership.familyId,
        deviceIdentifier: device.deviceIdentifier,
        name: "Duplicate Phone",
        platform: "ANDROID",
      },
    }),
  );

  await expectRejection("Missing family", ["P2003"], () =>
    prisma.device.create({
      data: {
        familyId: "00000000-0000-4000-8000-000000000099",
        deviceIdentifier: randomUUID(),
        name: "Orphan Phone",
        platform: "ANDROID",
      },
    }),
  );

  await expectRejection("Invalid device platform", ["22P02", "P2010"], () =>
    prisma.$executeRawUnsafe(
      `INSERT INTO devices (
        id, family_id, device_identifier, name, platform, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4::device_platform, 'PENDING'::device_status, NOW(), NOW()
      )`,
      membership.familyId,
      randomUUID(),
      "Invalid Platform",
      "IOS",
    ),
  );

  await expectRejection("Null required user name", ["23502", "P2010"], () =>
    prisma.$executeRawUnsafe(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, NULL, $3, NOW(), NOW()
      )`,
      `null-check-${randomUUID()}@example.com`,
      "rejected-before-persist",
      "User",
    ),
  );

  console.log(
    JSON.stringify({
      ok: true,
      user: publicUser.email,
      family: membership.family.name,
      role: membership.role,
      device: device.name,
      status: device.status,
    }),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Database verification failed.");
    await prisma.$disconnect();
    process.exit(1);
  });
