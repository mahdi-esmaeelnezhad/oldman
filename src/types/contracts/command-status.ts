export const commandStatuses = [
  "PENDING",
  "SENT",
  "RECEIVED",
  "EXECUTING",
  "SUCCESS",
  "FAILED",
  "UNSUPPORTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type CommandStatus = (typeof commandStatuses)[number];

export const commandResultStatuses = ["SUCCESS", "FAILED", "UNSUPPORTED"] as const;

export type CommandResultStatus = (typeof commandResultStatuses)[number];
