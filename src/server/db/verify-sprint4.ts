const BASE_URL = "http://localhost:3000";
const DEMO_DEVICE_CREDENTIAL = "demo-device-credential-token-sprint3-verify";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  return { status: response.status, body, setCookie: response.headers.get("set-cookie") };
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
  assert(login.status === 200 && login.setCookie, "Login failed");
  const cookie = login.setCookie.split(";")[0];

  const families = await request("/api/families", { headers: { cookie } });
  const familyList = families.body as { families: Array<{ id: string; name: string }> };
  const demo = familyList.families.find((family) => family.name === "Demo Family");
  assert(demo, "Demo family missing");

  const family = await request(`/api/families/${demo.id}`, { headers: { cookie } });
  const familyBody = family.body as { family: { devices: Array<{ id: string; name: string }> } };
  const device = familyBody.family.devices[0];
  assert(device, "Device missing");

  const location = await request(`/api/families/${demo.id}/devices/${device.id}/location`, {
    headers: { cookie },
  });
  assert(location.status === 200, "Location API failed");
  const locationBody = location.body as { location: { available: boolean; latitude: number | null } };
  assert(locationBody.location.available, "Expected available location");
  assert(locationBody.location.latitude !== null, "Expected latitude");

  const geofences = await request(`/api/families/${demo.id}/devices/${device.id}/geofences`, {
    headers: { cookie },
  });
  assert(geofences.status === 200, "Geofences list failed");
  const geofenceBody = geofences.body as { geofences: Array<{ id: string; name: string }> };
  const home = geofenceBody.geofences.find((item) => item.name === "Home");
  assert(home, "Home geofence missing");

  const created = await request(`/api/families/${demo.id}/devices/${device.id}/geofences`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      name: "Park",
      latitude: 35.71,
      longitude: 51.4,
      radiusMeters: 250,
      enabled: true,
    }),
  });
  assert(created.status === 201, "Create geofence failed");

  const enter = await request("/api/device/geofence-events", {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ geofenceId: home.id, type: "ENTERED" }),
  });
  assert(enter.status === 201, "Enter event failed");
  const enterBody = enter.body as { accepted: boolean; notificationId: string | null };
  assert(enterBody.accepted && enterBody.notificationId, "Enter should create notification");

  const duplicate = await request("/api/device/geofence-events", {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ geofenceId: home.id, type: "ENTERED" }),
  });
  assert(duplicate.status === 200, "Duplicate should be 200");
  const duplicateBody = duplicate.body as { accepted: boolean };
  assert(!duplicateBody.accepted, "Duplicate enter must be rejected");

  const exit = await request("/api/device/geofence-events", {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ geofenceId: home.id, type: "EXITED" }),
  });
  assert(exit.status === 201, "Exit event failed");

  const notifications = await request(`/api/families/${demo.id}/notifications`, {
    headers: { cookie },
  });
  assert(notifications.status === 200, "Notifications failed");
  const notificationsBody = notifications.body as {
    notifications: Array<{ title: string }>;
  };
  assert(
    notificationsBody.notifications.some((item) => item.title.includes("Home")),
    "Expected Home notification",
  );

  const locationUpdate = await request("/api/device/location", {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({
      latitude: 35.69,
      longitude: 51.39,
      locationPermission: "GRANTED",
      locationServiceEnabled: true,
    }),
  });
  assert(locationUpdate.status === 200, "Device location update failed");

  console.log(JSON.stringify({ ok: true, familyId: demo.id, deviceId: device.id }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "UnknownError");
  process.exit(1);
});
