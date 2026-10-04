import "dotenv/config";

import { sanitizeAuditMetadata } from "../audit/audit-service";
import { roleHasPermission, rolePermissions } from "../auth/permissions";

const BASE_URL = "http://localhost:3000";

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
  assert(roleHasPermission("OWNER", "SECURITY_MANAGE"), "OWNER needs SECURITY_MANAGE");
  assert(roleHasPermission("CAREGIVER", "CONTACT_MANAGE"), "CAREGIVER needs CONTACT_MANAGE");
  assert(!roleHasPermission("CAREGIVER", "SECURITY_MANAGE"), "CAREGIVER must not have SECURITY_MANAGE");
  assert(roleHasPermission("TECHNICAL_HELPER", "SECURITY_MANAGE"), "TECHNICAL_HELPER needs SECURITY_MANAGE");
  assert(!roleHasPermission("TECHNICAL_HELPER", "CONTACT_MANAGE"), "TECHNICAL_HELPER must not manage contacts");
  assert(!roleHasPermission("VIEWER", "DEVICE_MANAGE"), "VIEWER must not manage devices");
  assert(roleHasPermission("VIEWER", "DEVICE_VIEW"), "VIEWER needs DEVICE_VIEW");
  assert(rolePermissions.OWNER.length === 8, "OWNER should have all permissions");

  const sanitized = sanitizeAuditMetadata({
    commandType: "CREATE_CONTACT",
    contactId: "c1",
    phoneNumber: "+98912",
    password: "secret",
    token: "abc",
    deviceCredential: "cred",
    payload: { displayName: "x", phoneNumber: "y" },
    packageName: "com.example",
  });
  assert(sanitized && typeof sanitized === "object", "sanitize should keep safe object");
  const meta = sanitized as Record<string, unknown>;
  assert(meta.commandType === "CREATE_CONTACT", "commandType kept");
  assert(meta.contactId === "c1", "contactId kept");
  assert(meta.packageName === "com.example", "packageName kept");
  assert(meta.phoneNumber === undefined, "phoneNumber must be stripped");
  assert(meta.password === undefined, "password must be stripped");
  assert(meta.token === undefined, "token must be stripped");
  assert(meta.deviceCredential === undefined, "deviceCredential must be stripped");
  assert(meta.payload === undefined, "payload must be stripped");

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
  assert(create.status === 201, "Create settings command failed");
  const createBody = create.body as { command: { commandId: string } };

  const audit = await request(`/api/families/${demo.id}/audit-logs?deviceId=${device.id}`, {
    headers: { cookie },
  });
  assert(audit.status === 200, "Audit logs API failed");
  const auditBody = audit.body as {
    auditLogs: Array<{
      action: string;
      status: string;
      commandId: string | null;
      metadata: Record<string, unknown> | null;
    }>;
  };
  assert(
    auditBody.auditLogs.some(
      (entry) =>
        entry.action === "COMMAND_CREATED" &&
        entry.commandId === createBody.command.commandId &&
        entry.status === "PENDING",
    ),
    "COMMAND_CREATED audit missing",
  );
  assert(
    auditBody.auditLogs.every((entry) => {
      const metadata = entry.metadata ?? {};
      return (
        metadata.password === undefined &&
        metadata.token === undefined &&
        metadata.payload === undefined &&
        metadata.deviceCredential === undefined &&
        metadata.phoneNumber === undefined
      );
    }),
    "Audit metadata leaked sensitive fields",
  );

  console.log("Sprint 7 verification passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
