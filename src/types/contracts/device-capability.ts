import type { CommandType } from "@/types/contracts/command";

export type DeviceCapability = {
  readonly [K in CommandType]: boolean;
} & {
  readonly silentInstall: boolean;
};

export function isCommandSupported(capability: DeviceCapability, type: CommandType): boolean {
  return capability[type];
}
