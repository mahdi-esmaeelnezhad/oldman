"use client";

import { useEffect, useEffectEvent } from "react";
import type { FamilyRealtimeEvent } from "@/types/contracts/family-realtime-event";

type UseFamilyRealtimeOptions = {
  familyId: string;
  deviceId?: string;
  enabled?: boolean;
  onEvent: (event: FamilyRealtimeEvent) => void;
};

export function useFamilyRealtime({
  familyId,
  deviceId,
  enabled = true,
  onEvent,
}: UseFamilyRealtimeOptions): void {
  const handleEvent = useEffectEvent((event: FamilyRealtimeEvent) => {
    onEvent(event);
  });

  useEffect(() => {
    if (!enabled || !familyId) {
      return;
    }

    const params = new URLSearchParams();
    if (deviceId) {
      params.set("deviceId", deviceId);
    }
    const query = params.toString();
    const url = `/api/families/${familyId}/events${query ? `?${query}` : ""}`;
    const source = new EventSource(url);

    const handleMessage = (type: FamilyRealtimeEvent["type"]) => (message: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(message.data) as FamilyRealtimeEvent;
        if (parsed.type !== type) {
          return;
        }
        handleEvent(parsed);
      } catch {
        // ignore malformed payloads
      }
    };

    source.addEventListener("CommandResult", handleMessage("CommandResult"));
    source.addEventListener("DeviceStatus", handleMessage("DeviceStatus"));
    source.addEventListener("GeofenceEvent", handleMessage("GeofenceEvent"));
    source.addEventListener("DeviceEvent", handleMessage("DeviceEvent"));

    return () => {
      source.close();
    };
  }, [deviceId, enabled, familyId]);
}
