"use client";

import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { BackNav } from "@/components/back-nav";
import { SurfaceCard } from "@/components/surface-card";
import { useI18n } from "@/i18n/i18n-provider";
import { formatBytes, storageUsedPercent } from "@/lib/format-storage";
import type { DeviceDashboard } from "@/server/devices/device-service";
import type { DeviceStatus } from "@/generated/prisma/enums";

type DeviceDashboardViewProps = {
  device: DeviceDashboard;
};

function statusDotColor(status: DeviceStatus): string {
  switch (status) {
    case "ONLINE":
      return "#1B8A5A";
    case "PENDING":
      return "#C9851A";
    case "OFFLINE":
      return "#8A9AAB";
    case "DISABLED":
      return "#D64545";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled device status: ${String(exhaustive)}`);
    }
  }
}

function ModuleTile({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Box
      component={NextLink}
      href={href}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        textDecoration: "none",
        color: "inherit",
        minHeight: 132,
        boxShadow: "none",
        transition: "border-color 120ms ease",
        "&:hover": {
          borderColor: "rgba(11, 127, 191, 0.35)",
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: "rgba(11,127,191,0.1)",
          color: "primary.main",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

export function DeviceDashboardView({ device }: DeviceDashboardViewProps) {
  const { copy, deviceStatusLabels, platformLabels, formatDateTime, dateLocale } = useI18n();
  const usedPercent = storageUsedPercent(device.storageTotalBytes, device.storageAvailableBytes);
  const totalLabel = formatBytes(device.storageTotalBytes, dateLocale);
  const usedLabel =
    device.storageTotalBytes && device.storageAvailableBytes
      ? formatBytes(
          (BigInt(device.storageTotalBytes) - BigInt(device.storageAvailableBytes)).toString(),
          dateLocale,
        )
      : null;
  const modelLabel = [device.manufacturer, device.model].filter(Boolean).join(" ") || device.name;
  const base = `/families/${device.familyId}/devices/${device.id}`;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <BackNav href={`/families/${device.familyId}`} label={copy.backToFamily} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 500 }}>
            {device.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {device.familyName}
          </Typography>
        </Box>
      </Stack>

      <SurfaceCard>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "rgba(11,127,191,0.12)",
                color: "primary.main",
                display: "grid",
                placeItems: "center",
              }}
            >
              <PhoneIphoneOutlinedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500 }}>{modelLabel}</Typography>
              <Typography variant="body2" color="text.secondary">
                {platformLabels[device.platform]}
                {device.androidVersion ? ` ${device.androidVersion}` : ""}
                {device.lastSeenAt
                  ? ` · ${copy.connectedSince} ${formatDateTime(new Date(device.lastSeenAt))}`
                  : ""}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={deviceStatusLabels[device.status]}
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: statusDotColor(device.status),
                    ml: "8px !important",
                  }}
                />
              }
              sx={{ bgcolor: "rgba(27,138,90,0.1)", border: "none" }}
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {copy.lastSeen}
              </Typography>
              <Typography sx={{ fontWeight: 500 }}>
                {device.lastSeenAt ? formatDateTime(new Date(device.lastSeenAt)) : copy.neverSeen}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {copy.battery}
                {device.batteryLevelPercent !== null ? `: ${device.batteryLevelPercent}٪` : ""}
              </Typography>
              {device.batteryLevelPercent !== null ? (
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, device.batteryLevelPercent))}
                  sx={{ mt: 1, height: 6, borderRadius: 999, bgcolor: "rgba(11,127,191,0.1)" }}
                />
              ) : (
                <Typography sx={{ fontWeight: 500 }}>{copy.valueUnknown}</Typography>
              )}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {copy.storage}
                {usedLabel && totalLabel ? `: ${usedLabel} ${copy.storageOf} ${totalLabel}` : ""}
              </Typography>
              {usedPercent !== null ? (
                <LinearProgress
                  variant="determinate"
                  value={usedPercent}
                  sx={{ mt: 1, height: 6, borderRadius: 999, bgcolor: "rgba(11,127,191,0.1)" }}
                />
              ) : (
                <Typography sx={{ fontWeight: 500 }}>{copy.valueUnknown}</Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </SurfaceCard>

      <SurfaceCard>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "rgba(11,127,191,0.1)",
              color: "primary.main",
              display: "grid",
              placeItems: "center",
            }}
          >
            <LocationOnOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 500 }}>{copy.lastLocation}</Typography>
            <Typography variant="body2" color="text.secondary">
              {copy.openLocation}
            </Typography>
          </Box>
          <Button component={NextLink} href={`${base}/location`} variant="outlined" size="small">
            {copy.onMap}
          </Button>
        </Stack>
      </SurfaceCard>

      <Stack spacing={1.25}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {copy.deviceManagement}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
            gap: 1.25,
          }}
        >
          <ModuleTile
            href={`${base}/apps`}
            title={copy.openApps}
            subtitle={copy.moduleAppsHint}
            icon={<AppsOutlinedIcon fontSize="small" />}
          />
          <ModuleTile
            href={`${base}/contacts`}
            title={copy.openContacts}
            subtitle={copy.moduleContactsHint}
            icon={<ContactsOutlinedIcon fontSize="small" />}
          />
          <ModuleTile
            href={`${base}/location`}
            title={copy.openLocation}
            subtitle={copy.moduleLocationHint}
            icon={<LocationOnOutlinedIcon fontSize="small" />}
          />
          <ModuleTile
            href={`${base}/settings`}
            title={copy.openSettings}
            subtitle={copy.moduleSettingsHint}
            icon={<TuneOutlinedIcon fontSize="small" />}
          />
          <ModuleTile
            href={`${base}/commands`}
            title={copy.openCommands}
            subtitle={copy.moduleCommandsHint}
            icon={<ListAltOutlinedIcon fontSize="small" />}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
