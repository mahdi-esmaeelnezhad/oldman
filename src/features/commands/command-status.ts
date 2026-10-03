import type { ChipProps } from "@mui/material/Chip";
import type { CommandStatus } from "@/types/contracts/command-status";

export function commandStatusColor(status: CommandStatus): ChipProps["color"] {
  switch (status) {
    case "PENDING":
    case "SENT":
    case "RECEIVED":
    case "EXECUTING":
      return "warning";
    case "SUCCESS":
      return "success";
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return "error";
    case "UNSUPPORTED":
      return "default";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled command status: ${String(exhaustive)}`);
    }
  }
}

export function isActiveCommand(status: CommandStatus): boolean {
  switch (status) {
    case "PENDING":
    case "SENT":
    case "RECEIVED":
    case "EXECUTING":
      return true;
    case "SUCCESS":
    case "FAILED":
    case "UNSUPPORTED":
    case "EXPIRED":
    case "CANCELLED":
      return false;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled command status: ${String(exhaustive)}`);
    }
  }
}

export function isCancellableCommand(status: CommandStatus): boolean {
  switch (status) {
    case "PENDING":
    case "SENT":
    case "RECEIVED":
      return true;
    case "EXECUTING":
    case "SUCCESS":
    case "FAILED":
    case "UNSUPPORTED":
    case "EXPIRED":
    case "CANCELLED":
      return false;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled command status: ${String(exhaustive)}`);
    }
  }
}
