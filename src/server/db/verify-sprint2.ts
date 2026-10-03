const BASE_URL = "http://127.0.0.1:3000";

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown; cookie?: string }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  const setCookie = response.headers.get("set-cookie") ?? undefined;
  const cookie = setCookie?.split(";")[0];
  return { status: response.status, body, cookie };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@example.com", password: "demo-password" }),
  });
  assert(login.status === 200 && login.cookie, "Owner login failed");
  const ownerCookie = login.cookie;

  const families = await request("/api/families", {
    headers: { cookie: ownerCookie },
  });
  assert(families.status === 200, "List families failed");
  const familyList = families.body as { families: Array<{ id: string; name: string }> };
  const demo = familyList.families.find((family) => family.name === "Demo Family");
  assert(demo, "Demo Family missing");

  const family = await request(`/api/families/${demo.id}`, {
    headers: { cookie: ownerCookie },
  });
  assert(family.status === 200, "Get family failed");
  const familyBody = family.body as {
    family: { devices: Array<{ id: string; name: string }> };
  };
  const device = familyBody.family.devices.find((item) => item.name === "Parent Phone");
  assert(device, "Parent Phone missing");

  const dashboard = await request(`/api/families/${demo.id}/devices/${device.id}`, {
    headers: { cookie: ownerCookie },
  });
  assert(dashboard.status === 200, "Device dashboard API failed");
  const deviceBody = dashboard.body as {
    device: {
      name: string;
      status: string;
      lastSeenAt: string | null;
      batteryLevelPercent: number | null;
      batteryCharging: boolean | null;
      storageTotalBytes: string | null;
      storageAvailableBytes: string | null;
      androidVersion: string | null;
      model: string | null;
      isDeviceOwner: boolean | null;
    };
  };

  assert(deviceBody.device.name === "Parent Phone", "Unexpected device name");
  assert(deviceBody.device.status === "ONLINE", "Expected ONLINE status");
  assert(deviceBody.device.lastSeenAt, "Expected lastSeenAt");
  assert(deviceBody.device.batteryLevelPercent === 72, "Expected battery percent");
  assert(deviceBody.device.batteryCharging === false, "Expected battery charging false");
  assert(deviceBody.device.storageTotalBytes === String(BigInt(128) * BigInt(1024) * BigInt(1024) * BigInt(1024)), "Expected storage total");
  assert(
    deviceBody.device.storageAvailableBytes === String(BigInt(48) * BigInt(1024) * BigInt(1024) * BigInt(1024)),
    "Expected storage available",
  );
  assert(deviceBody.device.androidVersion === "Android 15", "Expected android version");
  assert(deviceBody.device.model === "Demo Android", "Expected model");
  assert(deviceBody.device.isDeviceOwner === true, "Expected device owner");

  const guestRegister = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: `guest-device-${Date.now()}@example.com`,
      password: "guest-password",
      firstName: "Guest",
      lastName: "Device",
    }),
  });
  assert(guestRegister.status === 201 && guestRegister.cookie, "Guest register failed");

  const forbidden = await request(`/api/families/${demo.id}/devices/${device.id}`, {
    headers: { cookie: guestRegister.cookie },
  });
  assert(forbidden.status === 404, "Non-member should get 404");
  const forbiddenBody = forbidden.body as { error?: { code?: string } };
  assert(forbiddenBody.error?.code === "FAMILY_NOT_FOUND", "Expected FAMILY_NOT_FOUND");

  const missing = await request(`/api/families/${demo.id}/devices/00000000-0000-4000-8000-000000000000`, {
    headers: { cookie: ownerCookie },
  });
  assert(missing.status === 404, "Missing device should 404");

  console.log(JSON.stringify({ ok: true, deviceId: device.id, familyId: demo.id }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "UnknownError");
  process.exit(1);
});
