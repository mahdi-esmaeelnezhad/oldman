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

async function completeCommand(commandId: string, data: Record<string, unknown> | null = null) {
  await request("/api/device/commands/pending", {
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
  });
  await request(`/api/device/commands/${commandId}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ status: "EXECUTING" }),
  });
  const result = await request(`/api/device/commands/${commandId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({
      status: "SUCCESS",
      data,
      error: null,
    }),
  });
  assert(result.status === 200, `Complete command failed for ${commandId}`);
  return result.body as { command: { status: string } };
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

  const contacts = await request(`/api/families/${demo.id}/devices/${device.id}/contacts`, {
    headers: { cookie },
  });
  assert(contacts.status === 200, "Contacts page failed");
  const contactsBody = contacts.body as {
    contacts: Array<{ contactId: string; displayName: string }>;
    capabilities: { CREATE_CONTACT: boolean; UPDATE_CONTACT: boolean; DELETE_CONTACT: boolean };
  };
  assert(contactsBody.capabilities.CREATE_CONTACT, "CREATE_CONTACT should be supported");
  assert(
    contactsBody.contacts.some((contact) => contact.displayName === "خانه"),
    "Seeded contact missing",
  );

  const create = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      type: "CREATE_CONTACT",
      payload: { displayName: "پارک", phoneNumber: "+989144444444" },
    }),
  });
  assert(create.status === 201, "Create contact command failed");
  const createBody = create.body as { command: { id: string } };
  await completeCommand(createBody.command.id, { contactId: "contact-park" });

  const contactsAfterCreate = await request(`/api/families/${demo.id}/devices/${device.id}/contacts`, {
    headers: { cookie },
  });
  const afterCreateBody = contactsAfterCreate.body as {
    contacts: Array<{ contactId: string; displayName: string }>;
  };
  assert(
    afterCreateBody.contacts.some((contact) => contact.contactId === "contact-park"),
    "Created contact missing after command success",
  );

  const settings = await request(`/api/families/${demo.id}/devices/${device.id}/settings`, {
    headers: { cookie },
  });
  assert(settings.status === 200, "Settings page failed");
  const settingsBody = settings.body as {
    settings: Array<{ key: string; section: string; active: boolean }>;
    capabilities: { GET_SETTINGS: boolean; SET_SETTING: boolean };
  };
  assert(settingsBody.capabilities.GET_SETTINGS, "GET_SETTINGS should be supported");
  assert(
    settingsBody.settings.some((setting) => setting.key === "wifi_enabled" && setting.active),
    "wifi_enabled should be active",
  );
  assert(
    settingsBody.settings.some((setting) => setting.key === "developer_options" && !setting.active),
    "developer_options should not be active",
  );
  assert(
    !settingsBody.settings.some((setting) => setting.key === "airplane_mode"),
    "Unsupported airplane_mode must not appear",
  );

  const setWifi = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      type: "SET_SETTING",
      payload: { key: "wifi_enabled", value: false },
    }),
  });
  assert(setWifi.status === 201, "SET_SETTING command failed");
  const setWifiBody = setWifi.body as { command: { id: string } };
  await completeCommand(setWifiBody.command.id, { key: "wifi_enabled" });

  const settingsAfter = await request(`/api/families/${demo.id}/devices/${device.id}/settings`, {
    headers: { cookie },
  });
  const settingsAfterBody = settingsAfter.body as {
    settings: Array<{ key: string; value: unknown }>;
  };
  assert(
    settingsAfterBody.settings.some(
      (setting) => setting.key === "wifi_enabled" && setting.value === false,
    ),
    "wifi_enabled should update after SET_SETTING",
  );

  const unsupported = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      type: "SET_SETTING",
      payload: { key: "airplane_mode", value: true },
    }),
  });
  assert(unsupported.status === 400, "Unsupported setting should be rejected");

  console.log(JSON.stringify({ ok: true, familyId: demo.id, deviceId: device.id }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "UnknownError");
  process.exit(1);
});
