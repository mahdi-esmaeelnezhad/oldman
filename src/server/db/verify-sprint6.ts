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
  return { status: response.status, body, setCookie: response.headers.get("set-cookie"), response };
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
  const familyBody = family.body as { family: { devices: Array<{ id: string }> } };
  const device = familyBody.family.devices[0];
  assert(device, "Device missing");

  const create = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      type: "GET_SETTINGS",
      payload: {},
    }),
  });
  assert(create.status === 201, "Create command failed");
  const createBody = create.body as {
    command: {
      commandId: string;
      id: string;
      deviceId: string;
      familyId: string;
      createdBy: string;
      type: string;
      payload: unknown;
      createdAt: string;
      expiresAt: string;
      status: string;
    };
  };
  assert(createBody.command.status === "PENDING", "Command should start PENDING");
  assert(createBody.command.commandId, "commandId required");
  assert(createBody.command.deviceId === device.id, "deviceId mismatch");
  assert(createBody.command.familyId === demo.id, "familyId mismatch");
  assert(createBody.command.createdBy, "createdBy required");
  assert(createBody.command.type === "GET_SETTINGS", "type mismatch");
  assert(createBody.command.createdAt && createBody.command.expiresAt, "timestamps required");

  const list = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    headers: { cookie },
  });
  assert(list.status === 200, "List commands failed");
  const listBody = list.body as { commands: Array<{ commandId: string; status: string }> };
  assert(
    listBody.commands.some((command) => command.commandId === createBody.command.commandId),
    "Created command missing from queue",
  );

  const pending = await request("/api/device/commands/pending", {
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
  });
  assert(pending.status === 200, "Pending fetch failed");
  const pendingBody = pending.body as { commands: Array<{ id: string; status: string }> };
  assert(
    pendingBody.commands.some(
      (command) => command.id === createBody.command.commandId && command.status === "SENT",
    ),
    "Command should become SENT",
  );

  const progress = await request(`/api/device/commands/${createBody.command.commandId}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({ status: "EXECUTING" }),
  });
  assert(progress.status === 200, "Progress update failed");

  const cancelBusy = await request(
    `/api/families/${demo.id}/devices/${device.id}/commands/${createBody.command.commandId}`,
    { method: "DELETE", headers: { cookie } },
  );
  assert(cancelBusy.status === 409, "Executing command should not cancel");

  const complete = await request(`/api/device/commands/${createBody.command.commandId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${DEMO_DEVICE_CREDENTIAL}` },
    body: JSON.stringify({
      status: "SUCCESS",
      data: { settings: { wifi_enabled: true, brightness: 55 } },
      error: null,
    }),
  });
  assert(complete.status === 200, "Complete failed");
  const completeBody = complete.body as { command: { status: string; commandId: string } };
  assert(completeBody.command.status === "SUCCESS", "Expected SUCCESS");

  const cancellable = await request(`/api/families/${demo.id}/devices/${device.id}/commands`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      type: "SET_SETTING",
      payload: { key: "wifi_enabled", value: false },
    }),
  });
  assert(cancellable.status === 201, "Second command create failed");
  const cancellableBody = cancellable.body as { command: { commandId: string; status: string } };
  const cancelled = await request(
    `/api/families/${demo.id}/devices/${device.id}/commands/${cancellableBody.command.commandId}`,
    { method: "DELETE", headers: { cookie } },
  );
  assert(cancelled.status === 200, "Cancel failed");
  const cancelledBody = cancelled.body as { command: { status: string } };
  assert(cancelledBody.command.status === "CANCELLED", "Expected CANCELLED");

  const eventsResponse = await fetch(`${BASE_URL}/api/families/${demo.id}/events?deviceId=${device.id}`, {
    headers: { cookie },
  });
  assert(eventsResponse.status === 200, "SSE endpoint failed");
  assert(
    eventsResponse.headers.get("content-type")?.includes("text/event-stream"),
    "SSE content-type required",
  );
  eventsResponse.body?.cancel();

  console.log(
    JSON.stringify({
      ok: true,
      familyId: demo.id,
      deviceId: device.id,
      commandId: createBody.command.commandId,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "UnknownError");
  process.exit(1);
});
