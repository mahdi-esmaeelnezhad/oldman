import type { FamilyRealtimeEvent } from "@/types/contracts/family-realtime-event";

type FamilyListener = (event: FamilyRealtimeEvent) => void;

const listenersByFamily = new Map<string, Set<FamilyListener>>();

export function subscribeFamilyEvents(familyId: string, listener: FamilyListener): () => void {
  const existing = listenersByFamily.get(familyId) ?? new Set<FamilyListener>();
  existing.add(listener);
  listenersByFamily.set(familyId, existing);

  return () => {
    const current = listenersByFamily.get(familyId);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      listenersByFamily.delete(familyId);
    }
  };
}

export function publishFamilyEvent(event: FamilyRealtimeEvent): void {
  const familyId =
    event.type === "CommandResult"
      ? event.command.familyId
      : event.familyId;

  const listeners = listenersByFamily.get(familyId);
  if (!listeners || listeners.size === 0) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Keep fan-out resilient; one bad subscriber must not break others.
    }
  }
}

export function familyEventListenerCount(familyId: string): number {
  return listenersByFamily.get(familyId)?.size ?? 0;
}
