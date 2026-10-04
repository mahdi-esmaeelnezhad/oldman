"use client";

import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SurfaceCard } from "@/components/surface-card";
import { EnrollmentPanel } from "@/features/enrollment/enrollment-panel";
import { InviteMemberForm } from "@/features/families/invite-member-form";
import { useI18n } from "@/i18n/i18n-provider";
import type { DeviceStatus, UserRole } from "@/generated/prisma/enums";
import type { FamilyNotificationView } from "@/server/geofencing/geofence-service";

type FamilyMemberRow = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
};

type FamilyDeviceRow = {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  manufacturer?: string | null;
  model?: string | null;
};

type FamilyOverviewProps = {
  familyId: string;
  currentUserEmail: string;
  canInvite: boolean;
  canEnroll: boolean;
  members: FamilyMemberRow[];
  devices: FamilyDeviceRow[];
  initialNotifications: FamilyNotificationView[];
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

function SectionHeader({
  title,
  action,
  badge,
}: {
  title: string;
  action?: ReactNode;
  badge?: number;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        {badge && badge > 0 ? (
          <Badge
            badgeContent={badge}
            sx={{
              "& .MuiBadge-badge": {
                position: "static",
                transform: "none",
                bgcolor: "#E8A317",
                color: "#fff",
                fontWeight: 500,
              },
            }}
          />
        ) : null}
      </Stack>
      {action}
    </Stack>
  );
}

export function FamilyOverview({
  familyId,
  currentUserEmail,
  canInvite,
  canEnroll,
  members,
  devices,
  initialNotifications,
}: FamilyOverviewProps) {
  const { copy, deviceStatusLabels, roleLabels, formatDateTime } = useI18n();
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [inviteOpen, setInviteOpen] = useState(false);
  const unread = notifications.filter((item) => !item.readAt).length;

  async function markAllRead() {
    const unreadItems = notifications.filter((item) => !item.readAt);
    await Promise.all(
      unreadItems.map((item) =>
        fetch(`/api/families/${familyId}/notifications/${item.id}/read`, { method: "POST" }),
      ),
    );
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );
    router.refresh();
  }

  return (
    <Stack spacing={2.5}>
      <SurfaceCard>
        <SectionHeader
          title={copy.devices}
          action={canEnroll ? <EnrollmentPanel familyId={familyId} /> : undefined}
        />
        {devices.length === 0 ? (
          <Typography color="text.secondary">{copy.noDevices}</Typography>
        ) : (
          <Stack spacing={0} divider={<Divider flexItem />}>
            {devices.map((device) => {
              const modelBits = [device.manufacturer, device.model].filter(Boolean).join(" ");
              return (
                <Box
                  key={device.id}
                  component={NextLink}
                  href={`/families/${familyId}/devices/${device.id}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.5,
                    textDecoration: "none",
                    color: "inherit",
                    "&:first-of-type": { pt: 0.5 },
                    "&:last-of-type": { pb: 0.25 },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      opacity: 0.92,
                    }}
                  >
                    <PhoneIphoneOutlinedIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 500 }} noWrap>
                      {device.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {modelBits ? `${modelBits} · ` : ""}
                      {copy.lastSeen}:{" "}
                      {device.lastSeenAt ? formatDateTime(new Date(device.lastSeenAt)) : copy.neverSeen}
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
                    sx={{ bgcolor: "rgba(11,127,191,0.08)", border: "none" }}
                  />
                  <ChevronLeftOutlinedIcon color="action" fontSize="small" />
                </Box>
              );
            })}
          </Stack>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title={copy.members}
          action={
            canInvite ? (
              <Button variant="outlined" size="small" onClick={() => setInviteOpen((value) => !value)}>
                + {copy.inviteMember}
              </Button>
            ) : undefined
          }
        />
        {members.length === 0 ? (
          <Typography color="text.secondary">{copy.noMembers}</Typography>
        ) : (
          <Stack spacing={0} divider={<Divider flexItem />}>
            {members.map((member) => {
              const initial = (member.firstName || member.email).slice(0, 1);
              const isYou = member.email === currentUserEmail;
              return (
                <Stack
                  key={member.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "center", py: 1.25 }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "rgba(11,127,191,0.12)",
                      color: "primary.dark",
                      fontWeight: 500,
                    }}
                  >
                    {initial}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 500 }} noWrap>
                      {member.firstName} {member.lastName}
                      {isYou ? ` ${copy.youSuffix}` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {member.email}
                    </Typography>
                  </Box>
                  <Chip size="small" label={roleLabels[member.role]} color="primary" variant="outlined" />
                </Stack>
              );
            })}
          </Stack>
        )}
        {canInvite && inviteOpen ? (
          <Box sx={{ mt: 2 }}>
            <InviteMemberForm familyId={familyId} />
          </Box>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title={copy.notificationsTitle}
          badge={unread}
          action={
            unread > 0 ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CheckOutlinedIcon />}
                onClick={markAllRead}
              >
                {copy.markRead}
              </Button>
            ) : undefined
          }
        />
        {notifications.length === 0 ? (
          <Typography color="text.secondary">{copy.notificationsEmpty}</Typography>
        ) : (
          <Stack spacing={0} divider={<Divider flexItem />}>
            {notifications.map((notification) => (
              <Stack
                key={notification.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", py: 1.25 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: "rgba(11,127,191,0.1)",
                    color: "primary.main",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <NotificationsNoneOutlinedIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>{notification.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDateTime(new Date(notification.createdAt))}
                  </Typography>
                </Box>
                {!notification.readAt ? (
                  <Chip
                    size="small"
                    label={copy.notificationNew}
                    color="primary"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            ))}
          </Stack>
        )}
      </SurfaceCard>
    </Stack>
  );
}
