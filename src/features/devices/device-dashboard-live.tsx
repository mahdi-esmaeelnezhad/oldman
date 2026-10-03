"use client";

import { useState } from "react";
import { DeviceDashboardView } from "@/features/devices/device-dashboard-view";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import type { DeviceDashboard } from "@/server/devices/device-service";

type DeviceDashboardLiveProps = {
  familyId: string;
  device: DeviceDashboard;
};

export function DeviceDashboardLive({ familyId, device }: DeviceDashboardLiveProps) {
  const [liveDevice, setLiveDevice] = useState(device);

  useFamilyRealtime({
    familyId,
    deviceId: device.id,
    onEvent: (event) => {
      if (event.type === "DeviceStatus" && event.deviceId === device.id) {
        setLiveDevice((current) => ({
          ...current,
          status: event.status,
          lastSeenAt: event.lastSeenAt,
        }));
      }
    },
  });

  return <DeviceDashboardView device={liveDevice} />;
}
