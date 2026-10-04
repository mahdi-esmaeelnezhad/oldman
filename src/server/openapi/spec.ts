import { sessionCookieName } from "@/config/session";

const errorSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
} as const;

function path(summary: string, opts: {
  tags: string[];
  security?: Array<Record<string, string[]>>;
  requestBody?: Record<string, unknown>;
  parameters?: Array<Record<string, unknown>>;
  responses?: Record<string, unknown>;
}) {
  return {
    summary,
    tags: opts.tags,
    security: opts.security,
    parameters: opts.parameters,
    requestBody: opts.requestBody,
    responses: {
      "200": { description: "OK" },
      "201": { description: "Created" },
      "400": { description: "Bad request", content: { "application/json": { schema: errorSchema } } },
      "401": { description: "Unauthenticated", content: { "application/json": { schema: errorSchema } } },
      "403": { description: "Forbidden", content: { "application/json": { schema: errorSchema } } },
      "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
      ...(opts.responses ?? {}),
    },
  };
}

const uuidParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
  description,
});

const cookieAuth = [{ cookieAuth: [] }];
const deviceAuth = [{ deviceBearer: [] }];

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "Family Care API",
      version: "0.1.0",
      description:
        "REST API for the Family Care web app and Android device agent. " +
        `Caregiver APIs use the \`${sessionCookieName}\` session cookie after login. ` +
        "Device agent APIs use `Authorization: Bearer <deviceCredential>`.",
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: "Auth" },
      { name: "Families" },
      { name: "Devices" },
      { name: "Commands" },
      { name: "Apps" },
      { name: "Contacts" },
      { name: "Settings" },
      { name: "Location" },
      { name: "Geofences" },
      { name: "Notifications" },
      { name: "Audit" },
      { name: "Enrollment" },
      { name: "Device Agent" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: sessionCookieName,
          description: "Session cookie set by POST /api/auth/login or /api/auth/register.",
        },
        deviceBearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "deviceCredential",
          description: "Device credential returned from enrollment redeem.",
        },
      },
    },
    paths: {
      "/api/auth/register": {
        post: path("Register user", {
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "firstName", "lastName"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/auth/login": {
        post: path("Login", {
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "owner@example.com" },
                    password: { type: "string", example: "demo-password" },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/auth/logout": {
        post: path("Logout", { tags: ["Auth"], security: cookieAuth }),
      },
      "/api/auth/me": {
        get: path("Current user", { tags: ["Auth"], security: cookieAuth }),
      },
      "/api/families": {
        get: path("List families", { tags: ["Families"], security: cookieAuth }),
        post: path("Create family", {
          tags: ["Families"],
          security: cookieAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: { name: { type: "string" } },
                },
              },
            },
          },
        }),
      },
      "/api/families/{familyId}": {
        get: path("Get family", {
          tags: ["Families"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id")],
        }),
      },
      "/api/families/{familyId}/members": {
        get: path("List members", {
          tags: ["Families"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id")],
        }),
        post: path("Invite member", {
          tags: ["Families"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id")],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "role"],
                  properties: {
                    email: { type: "string", format: "email" },
                    role: {
                      type: "string",
                      enum: ["OWNER", "CAREGIVER", "TECHNICAL_HELPER", "VIEWER"],
                    },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/families/{familyId}/enrollments": {
        post: path("Create enrollment session (QR)", {
          tags: ["Enrollment"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id")],
        }),
      },
      "/api/enrollments/redeem": {
        post: path("Redeem enrollment token (device)", {
          tags: ["Enrollment", "Device Agent"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "deviceIdentifier", "name"],
                  properties: {
                    token: { type: "string" },
                    deviceIdentifier: { type: "string" },
                    name: { type: "string" },
                    manufacturer: { type: "string" },
                    model: { type: "string" },
                    androidVersion: { type: "string" },
                    androidSdk: { type: "integer" },
                    appVersion: { type: "string" },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}": {
        get: path("Device dashboard", {
          tags: ["Devices"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/commands": {
        get: path("List recent commands", {
          tags: ["Commands"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
        post: path("Create managed command", {
          tags: ["Commands"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["type", "payload"],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "INSTALL_APP",
                        "UNINSTALL_APP",
                        "ENABLE_APP",
                        "DISABLE_APP",
                        "CREATE_CONTACT",
                        "UPDATE_CONTACT",
                        "DELETE_CONTACT",
                        "GET_SETTINGS",
                        "SET_SETTING",
                      ],
                    },
                    payload: { type: "object", additionalProperties: true },
                  },
                },
                examples: {
                  getSettings: {
                    summary: "GET_SETTINGS",
                    value: { type: "GET_SETTINGS", payload: {} },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/commands/{commandId}": {
        get: path("Get command", {
          tags: ["Commands"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("deviceId", "Device id"),
            uuidParam("commandId", "Command id"),
          ],
        }),
        delete: path("Cancel command", {
          tags: ["Commands"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("deviceId", "Device id"),
            uuidParam("commandId", "Command id"),
          ],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/apps": {
        get: path("List device apps + catalog", {
          tags: ["Apps"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/contacts": {
        get: path("List contacts", {
          tags: ["Contacts"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("deviceId", "Device id"),
            { name: "q", in: "query", schema: { type: "string" }, description: "Search query" },
          ],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/settings": {
        get: path("List device settings", {
          tags: ["Settings"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/location": {
        get: path("Get device location", {
          tags: ["Location"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/geofences": {
        get: path("List geofences", {
          tags: ["Geofences"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
        }),
        post: path("Create geofence", {
          tags: ["Geofences"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id"), uuidParam("deviceId", "Device id")],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "latitude", "longitude", "radiusMeters"],
                  properties: {
                    name: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    radiusMeters: { type: "integer" },
                    enabled: { type: "boolean" },
                  },
                },
              },
            },
          },
        }),
      },
      "/api/families/{familyId}/devices/{deviceId}/geofences/{geofenceId}": {
        patch: path("Update geofence", {
          tags: ["Geofences"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("deviceId", "Device id"),
            uuidParam("geofenceId", "Geofence id"),
          ],
        }),
        delete: path("Delete geofence", {
          tags: ["Geofences"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("deviceId", "Device id"),
            uuidParam("geofenceId", "Geofence id"),
          ],
        }),
      },
      "/api/families/{familyId}/notifications": {
        get: path("List family notifications", {
          tags: ["Notifications"],
          security: cookieAuth,
          parameters: [uuidParam("familyId", "Family id")],
        }),
      },
      "/api/families/{familyId}/notifications/{notificationId}/read": {
        post: path("Mark notification read", {
          tags: ["Notifications"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            uuidParam("notificationId", "Notification id"),
          ],
        }),
      },
      "/api/families/{familyId}/audit-logs": {
        get: path("List audit logs", {
          tags: ["Audit"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            { name: "deviceId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "take", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
        }),
      },
      "/api/families/{familyId}/events": {
        get: path("Family realtime SSE stream", {
          tags: ["Families"],
          security: cookieAuth,
          parameters: [
            uuidParam("familyId", "Family id"),
            { name: "deviceId", in: "query", schema: { type: "string", format: "uuid" } },
          ],
        }),
      },
      "/api/location/search": {
        get: path("Search places (Nominatim proxy)", {
          tags: ["Location"],
          security: cookieAuth,
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" } },
          ],
        }),
      },
      "/api/device/commands/pending": {
        get: path("Pull pending commands", {
          tags: ["Device Agent", "Commands"],
          security: deviceAuth,
        }),
      },
      "/api/device/commands/{commandId}": {
        patch: path("Update command progress", {
          tags: ["Device Agent", "Commands"],
          security: deviceAuth,
          parameters: [uuidParam("commandId", "Command id")],
        }),
        post: path("Submit command result", {
          tags: ["Device Agent", "Commands"],
          security: deviceAuth,
          parameters: [uuidParam("commandId", "Command id")],
        }),
      },
      "/api/device/location": {
        post: path("Report device location", {
          tags: ["Device Agent", "Location"],
          security: deviceAuth,
        }),
      },
      "/api/device/geofence-events": {
        post: path("Report geofence event", {
          tags: ["Device Agent", "Geofences"],
          security: deviceAuth,
        }),
      },
    },
  };
}
