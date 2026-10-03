import "dotenv/config";
import bcrypt from "bcryptjs";

import { demoDeviceCapabilities } from "../src/config/device-capabilities";
import { demoDeviceSettings, getDeviceSettingDefinition } from "../src/config/device-settings";
import { prisma } from "../src/lib/prisma";
import { hashSecret } from "../src/server/auth/secrets";
import { normalizeEmail } from "../src/server/users/normalize-email";

const DEMO_OWNER_EMAIL = "Owner@Example.com";
const DEMO_OWNER_PASSWORD = "demo-password";
const DEMO_DEVICE_IDENTIFIER = "c4e8a1b2-6d3f-4a9e-8b17-2f5c9d0e6a41";
const DEMO_DEVICE_CREDENTIAL = "demo-device-credential-token-sprint3-verify";
const BCRYPT_COST = 12;

const catalogEntries = [
  {
    packageName: "com.spotify.music",
    label: "Spotify",
    versionName: "8.9.0",
  },
  {
    packageName: "org.telegram.messenger",
    label: "Telegram",
    versionName: "11.2.0",
  },
  {
    packageName: "com.whatsapp",
    label: "WhatsApp",
    versionName: "2.24.20",
  },
] as const;

const contactSeeds = [
  { contactId: "contact-mom-home", displayName: "خانه", phoneNumber: "+989121111111" },
  { contactId: "contact-doctor", displayName: "دکتر", phoneNumber: "+982122222222" },
  { contactId: "contact-school", displayName: "مدرسه", phoneNumber: "+982133333333" },
] as const;

async function main(): Promise<void> {
  const email = normalizeEmail(DEMO_OWNER_EMAIL);
  const passwordHash = await bcrypt.hash(DEMO_OWNER_PASSWORD, BCRYPT_COST);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: "Demo",
      lastName: "Owner",
    },
    create: {
      email,
      passwordHash,
      firstName: "Demo",
      lastName: "Owner",
    },
  });

  const existingMembership = await prisma.familyMember.findFirst({
    where: {
      userId: user.id,
      role: "OWNER",
    },
    include: {
      family: true,
    },
  });

  const family = existingMembership
    ? await prisma.family.update({
        where: { id: existingMembership.familyId },
        data: { name: "Demo Family" },
      })
    : await prisma.family.create({
        data: {
          name: "Demo Family",
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

  const device = await prisma.device.upsert({
    where: { deviceIdentifier: DEMO_DEVICE_IDENTIFIER },
    update: {
      familyId: family.id,
      name: "مادر",
      platform: "ANDROID",
      manufacturer: "Demo",
      model: "Demo Android",
      androidVersion: "Android 15",
      androidSdk: 35,
      appVersion: "1.0.0",
      status: "ONLINE",
      lastSeenAt: new Date(),
      batteryLevelPercent: 72,
      batteryCharging: false,
      storageTotalBytes: BigInt(128) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      storageAvailableBytes: BigInt(48) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      isDeviceOwner: true,
      credentialHash: hashSecret(DEMO_DEVICE_CREDENTIAL),
      capabilities: demoDeviceCapabilities,
      lastLatitude: 35.6892,
      lastLongitude: 51.389,
      lastLocationAt: new Date(),
      locationPermission: "GRANTED",
      locationServiceEnabled: true,
    },
    create: {
      familyId: family.id,
      deviceIdentifier: DEMO_DEVICE_IDENTIFIER,
      name: "مادر",
      platform: "ANDROID",
      manufacturer: "Demo",
      model: "Demo Android",
      androidVersion: "Android 15",
      androidSdk: 35,
      appVersion: "1.0.0",
      status: "ONLINE",
      lastSeenAt: new Date(),
      batteryLevelPercent: 72,
      batteryCharging: false,
      storageTotalBytes: BigInt(128) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      storageAvailableBytes: BigInt(48) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      isDeviceOwner: true,
      credentialHash: hashSecret(DEMO_DEVICE_CREDENTIAL),
      capabilities: demoDeviceCapabilities,
      lastLatitude: 35.6892,
      lastLongitude: 51.389,
      lastLocationAt: new Date(),
      locationPermission: "GRANTED",
      locationServiceEnabled: true,
    },
  });

  for (const entry of catalogEntries) {
    await prisma.appCatalogEntry.upsert({
      where: { packageName: entry.packageName },
      update: {
        label: entry.label,
        versionName: entry.versionName,
      },
      create: {
        packageName: entry.packageName,
        label: entry.label,
        versionName: entry.versionName,
      },
    });
  }

  await prisma.deviceApp.deleteMany({ where: { deviceId: device.id } });
  await prisma.deviceApp.createMany({
    data: [
      {
        deviceId: device.id,
        packageName: "com.android.settings",
        label: "Settings",
        versionName: "15",
        state: "ENABLED",
        isSystem: true,
        canUninstall: false,
        canDisable: false,
      },
      {
        deviceId: device.id,
        packageName: "com.whatsapp",
        label: "WhatsApp",
        versionName: "2.24.20",
        state: "ENABLED",
        isSystem: false,
        canUninstall: true,
        canDisable: true,
      },
      {
        deviceId: device.id,
        packageName: "com.google.android.calculator",
        label: "Calculator",
        versionName: "8.6",
        state: "ENABLED",
        isSystem: false,
        canUninstall: true,
        canDisable: true,
      },
    ],
  });

  await prisma.geofence.deleteMany({ where: { deviceId: device.id } });
  const geofenceSeeds = [
    { name: "Home", latitude: 35.6892, longitude: 51.389, radiusMeters: 500 },
    { name: "School", latitude: 35.701, longitude: 51.41, radiusMeters: 300 },
    { name: "Doctor", latitude: 35.72, longitude: 51.42, radiusMeters: 200 },
    { name: "Work", latitude: 35.7, longitude: 51.337, radiusMeters: 400 },
  ] as const;

  for (const seed of geofenceSeeds) {
    await prisma.geofence.create({
      data: {
        familyId: family.id,
        deviceId: device.id,
        createdBy: user.id,
        name: seed.name,
        latitude: seed.latitude,
        longitude: seed.longitude,
        radiusMeters: seed.radiusMeters,
        enabled: true,
      },
    });
  }

  await prisma.deviceContact.deleteMany({ where: { deviceId: device.id } });
  await prisma.deviceContact.createMany({
    data: contactSeeds.map((contact) => ({
      deviceId: device.id,
      contactId: contact.contactId,
      displayName: contact.displayName,
      phoneNumber: contact.phoneNumber,
    })),
  });

  await prisma.deviceSetting.deleteMany({ where: { deviceId: device.id } });
  for (const setting of demoDeviceSettings) {
    const definition = getDeviceSettingDefinition(setting.key);
    if (!definition) {
      continue;
    }
    await prisma.deviceSetting.create({
      data: {
        deviceId: device.id,
        key: setting.key,
        section: definition.section,
        value: setting.value,
        writable: definition.writable,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Database seed failed.");
    console.error(error instanceof Error ? error.name : "UnknownError");
    await prisma.$disconnect();
    process.exit(1);
  });
