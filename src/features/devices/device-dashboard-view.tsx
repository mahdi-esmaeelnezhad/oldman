import BatteryChargingFullOutlinedIcon from "@mui/icons-material/BatteryChargingFullOutlined";
import BatteryStdOutlinedIcon from "@mui/icons-material/BatteryStdOutlined";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import SdStorageOutlinedIcon from "@mui/icons-material/SdStorageOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ChipProps } from "@mui/material/Chip";
import type { ReactNode } from "react";
import { copy, deviceOwnerLabels, deviceStatusLabels } from "@/config/copy";
import { formatDateTime } from "@/lib/format-date-time";
import { formatBytes, storageUsedPercent } from "@/lib/format-storage";
import type { DeviceDashboard } from "@/server/devices/device-service";
import type { DeviceStatus } from "@/generated/prisma/enums";

type DeviceDashboardViewProps = {
  device: DeviceDashboard;
};

function connectionColor(status: DeviceStatus): ChipProps["color"] {
  switch (status) {
    case "PENDING":
      return "warning";
    case "ONLINE":
      return "success";
    case "OFFLINE":
      return "default";
    case "DISABLED":
      return "error";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled device status: ${String(exhaustive)}`);
    }
  }
}

function deviceOwnerLabel(value: boolean | null): string {
  if (value === true) {
    return deviceOwnerLabels.true;
  }
  if (value === false) {
    return deviceOwnerLabels.false;
  }
  return deviceOwnerLabels.unknown;
}

function MetricCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        width: "100%",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>{icon}</Box>
          <Typography variant="subtitle1">{title}</Typography>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function ValueText({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h5" component="p" sx={{ wordBreak: "break-word" }}>
      {children}
    </Typography>
  );
}

export function DeviceDashboardView({ device }: DeviceDashboardViewProps) {
  const usedPercent = storageUsedPercent(device.storageTotalBytes, device.storageAvailableBytes);
  const totalLabel = formatBytes(device.storageTotalBytes);
  const freeLabel = formatBytes(device.storageAvailableBytes);
  const modelLabel = [device.manufacturer, device.model].filter(Boolean).join(" · ") || copy.valueUnknown;
  const BatteryIcon = device.batteryCharging ? BatteryChargingFullOutlinedIcon : BatteryStdOutlinedIcon;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}>
          {device.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {copy.deviceDashboardTitle}
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="overline" sx={{ opacity: 0.9 }}>
            {copy.connectionStatus}
          </Typography>
          <Chip
            label={deviceStatusLabels[device.status]}
            color={connectionColor(device.status)}
            sx={{
              alignSelf: "flex-start",
              bgcolor: "common.white",
              fontWeight: 700,
            }}
          />
          <Typography variant="body2" sx={{ opacity: 0.95 }}>
            {copy.lastSeen}: {device.lastSeenAt ? formatDateTime(new Date(device.lastSeenAt)) : copy.neverSeen}
          </Typography>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
          },
          gap: 1.5,
        }}
      >
        <MetricCard title={copy.battery} icon={<BatteryIcon fontSize="small" />}>
          {device.batteryLevelPercent === null ? (
            <ValueText>{copy.valueUnknown}</ValueText>
          ) : (
            <Stack spacing={1}>
              <ValueText>{device.batteryLevelPercent}٪</ValueText>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, device.batteryLevelPercent))}
                sx={{ height: 10, borderRadius: 999 }}
              />
              <Typography variant="body2" color="text.secondary">
                {device.batteryCharging === null
                  ? copy.valueUnknown
                  : device.batteryCharging
                    ? copy.batteryCharging
                    : copy.batteryNotCharging}
              </Typography>
            </Stack>
          )}
        </MetricCard>

        <MetricCard title={copy.storage} icon={<SdStorageOutlinedIcon fontSize="small" />}>
          {usedPercent === null || totalLabel === null || freeLabel === null ? (
            <ValueText>{copy.valueUnknown}</ValueText>
          ) : (
            <Stack spacing={1}>
              <ValueText>
                {copy.storageUsed} {usedPercent}٪
              </ValueText>
              <LinearProgress variant="determinate" value={usedPercent} sx={{ height: 10, borderRadius: 999 }} />
              <Typography variant="body2" color="text.secondary">
                {copy.storageFree}: {freeLabel} / {totalLabel}
              </Typography>
            </Stack>
          )}
        </MetricCard>

        <MetricCard title={copy.androidVersion} icon={<PhoneAndroidOutlinedIcon fontSize="small" />}>
          <ValueText>{device.androidVersion ?? copy.valueUnknown}</ValueText>
        </MetricCard>

        <MetricCard title={copy.model} icon={<PhoneAndroidOutlinedIcon fontSize="small" />}>
          <ValueText>{modelLabel}</ValueText>
        </MetricCard>

        <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
          <MetricCard title={copy.deviceOwnerStatus} icon={<SecurityOutlinedIcon fontSize="small" />}>
            <ValueText>{deviceOwnerLabel(device.isDeviceOwner)}</ValueText>
          </MetricCard>
        </Box>
      </Box>
    </Stack>
  );
}
