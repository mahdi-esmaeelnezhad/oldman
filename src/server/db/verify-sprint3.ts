const BASE_URL = "http://localhost:3000";
const DEMO_DEVICE_CREDENTIAL = "demo-device-credential-token-sprint3-verify";

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  return { status: response.status, body };
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
  assert(login.status === 200, "Owner login failed");
  const setCookie = (await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@example.com", password: "demo-password" }),
  })).headers.get("set-cookie");
  const ownerCookie = setCookie?.split(";")[0];
  assert(ownerCookie, "Missing session cookie");

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
  const familyBody = family.body as { family: { devices: Array<{ id: string; name: string }> } };
  const device = familyBody.family.devices.find((item) => item.name === "Parent Phone");
  assert(device, "Parent Phone missing");

  const appsPage = await request(`/api/families/${demo.id}/devices/${device.id}/apps`, {
    headers: { cookie: ownerCookie },
  });
  assert(appsPage.status === 200, "Apps page failed");
  const appsBody = appsPage.body as {
    apps: Array<{ packageName: string }>;
    catalog: Array<{ packageName: string }>;
    capabilities: { INSTALL_APP: boolean; UNINSTALL_APP: boolean };
  };
  assert(appsBody.capabilities.INSTALL_APP, "INSTALL_APP should be supported");
  assert(
    appsBody.apps.some((app) => app.packageName === "com.android.settings"),
    "System settings app missing",
  );
  assert(
    appsBody.catalog.some((app) => app.packageName === "com.spotify.music"),
    "Spotify catalog entry missing",
  );

  const install = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie: ownerCookie },
    body: JSON.stringify({
      type: "INSTALL_APP",
      payload: { packageName: "com.spotify.music" },
    }),
  });
  assert(install.status === 201, "Install command create failed");
  const installBody = install.body as { command: { id: string; status: string } };
  assert(installBody.command.status === "PENDING", "Install should start PENDING");

  const pending = await request("/api/device/commands/pending", {
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
  });
  assert(pending.status === 200, "Device pending fetch failed");
  const pendingBody = pending.body as { commands: Array<{ id: string; status: string }> };
  assert(
    pendingBody.commands.some((command) => command.id === installBody.command.id && command.status === "SENT"),
    "Install command was not claimed as SENT",
  );

  const executing = await request(`/api/device/commands/${installBody.command.id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ status: "EXECUTING" }),
  });
  assert(executing.status === 200, "Mark executing failed");

  const success = await request(`/api/device/commands/${installBody.command.id}`, {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({
      status: "SUCCESS",
      data: { packageName: "com.spotify.music" },
      error: null,
    }),
  });
  assert(success.status === 200, "Install result failed");
  const successBody = success.body as { command: { status: string } };
  assert(successBody.command.status === "SUCCESS", "Install should be SUCCESS");

  const appsAfterInstall = await request(`/api/families/${demo.id}/devices/${device.id}/apps`, {
    headers: { cookie: ownerCookie },
  });
  const afterInstallBody = appsAfterInstall.body as {
    apps: Array<{ packageName: string }>;
    catalog: Array<{ packageName: string }>;
  };
  assert(
    afterInstallBody.apps.some((app) => app.packageName === "com.spotify.music"),
    "Spotify should appear after install success",
  );
  assert(
    !afterInstallBody.catalog.some((app) => app.packageName === "com.spotify.music"),
    "Spotify should leave catalog after install",
  );

  const uninstallSystem = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie: ownerCookie },
    body: JSON.stringify({
      type: "UNINSTALL_APP",
      payload: { packageName: "com.android.settings" },
    }),
  });
  assert(uninstallSystem.status === 400, "System uninstall should be rejected");
  const uninstallSystemBody = uninstallSystem.body as { error?: { code?: string } };
  assert(uninstallSystemBody.error?.code === "APP_UNINSTALL_UNSUPPORTED", "Expected APP_UNINSTALL_UNSUPPORTED");

  const uninstall = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie: ownerCookie },
    body: JSON.stringify({
      type: "UNINSTALL_APP",
      payload: { packageName: "com.google.android.calculator" },
    }),
  });
  assert(uninstall.status === 201, "Uninstall command create failed");
  const uninstallBody = uninstall.body as { command: { id: string } };

  await request("/api/device/commands/pending", {
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
  });
  const unsupported = await request(`/api/device/commands/${uninstallBody.command.id}`, {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({
      status: "UNSUPPORTED",
      data: null,
      error: { code: "SYSTEM_APP", message: "Protected application." },
    }),
  });
  assert(unsupported.status === 200, "Unsupported uninstall result failed");
  const unsupportedBody = unsupported.body as { command: { status: string } };
  assert(unsupportedBody.command.status === "UNSUPPORTED", "Expected UNSUPPORTED status");

  const stillThere = await request(`/api/families/${demo.id}/devices/${device.id}/apps`, {
    headers: { cookie: ownerCookie },
  });
  const stillThereBody = stillThere.body as { apps: Array<{ packageName: string }> };
  assert(
    stillThereBody.apps.some((app) => app.packageName === "com.google.android.calculator"),
    "App must remain when uninstall is unsupported",
  );

  console.log(JSON.stringify({ ok: true, deviceId: device.id, familyId: demo.id }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "UnknownError");
  process.exit(1);
});
