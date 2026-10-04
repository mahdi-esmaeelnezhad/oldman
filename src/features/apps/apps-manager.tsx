"use client";

import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageForApiError } from "@/config/api-errors";
import { commandStatusLabels, commandTypeLabels, copy, deviceAppStateLabels } from "@/config/copy";
import { commandStatusColor, isActiveCommand } from "@/features/commands/command-status";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import type { AppCatalogView, DeviceAppView } from "@/server/apps/app-service";
import type { CommandView } from "@/server/commands/command-service";
import type { DeviceCapability } from "@/types/contracts/device-capability";

type AppsManagerProps = {
  familyId: string;
  deviceId: string;
  canManage: boolean;
  capabilities: DeviceCapability;
  initialApps: DeviceAppView[];
  initialCatalog: AppCatalogView[];
  initialCommands: CommandView[];
};

function toCommandView(eventCommand: {
  commandId: string;
  familyId: string;
  deviceId: string;
  createdBy: string;
  type: CommandView["type"];
  payload: Record<string, unknown>;
  status: CommandView["status"];
  resultData?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  expiresAt: string;
  completedAt?: string | null;
}): CommandView {
  return {
    commandId: eventCommand.commandId,
    id: eventCommand.commandId,
    familyId: eventCommand.familyId,
    deviceId: eventCommand.deviceId,
    createdBy: eventCommand.createdBy,
    type: eventCommand.type,
    payload: eventCommand.payload,
    status: eventCommand.status,
    resultData: eventCommand.resultData ?? null,
    errorCode: eventCommand.errorCode ?? null,
    errorMessage: eventCommand.errorMessage ?? null,
    createdAt: eventCommand.createdAt,
    expiresAt: eventCommand.expiresAt,
    sentAt: null,
    receivedAt: null,
    startedAt: null,
    completedAt: eventCommand.completedAt ?? null,
  };
}

export function AppsManager({
  familyId,
  deviceId,
  canManage,
  capabilities,
  initialApps,
  initialCatalog,
  initialCommands,
}: AppsManagerProps) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApps);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [commands, setCommands] = useState(initialCommands);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [uninstallTarget, setUninstallTarget] = useState<DeviceAppView | null>(null);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(
    initialCommands.find((command) => isActiveCommand(command.status))?.id ?? null,
  );

  async function refreshApps() {
    const response = await fetch(`/api/families/${familyId}/devices/${deviceId}/apps`);
    if (!response.ok) {
      return;
    }
    const body = (await response.json()) as {
      apps: DeviceAppView[];
      catalog: AppCatalogView[];
    };
    setApps(body.apps);
    setCatalog(body.catalog);
    router.refresh();
  }

  useFamilyRealtime({
    familyId,
    deviceId,
    onEvent: (event) => {
      if (event.type === "CommandResult") {
        const next = toCommandView(event.command);
        setCommands((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 20));
        if (!isActiveCommand(next.status)) {
          setActiveCommandId((current) => (current === next.id ? null : current));
          setPending(false);
          if (
            next.type === "INSTALL_APP" ||
            next.type === "UNINSTALL_APP" ||
            next.type === "ENABLE_APP" ||
            next.type === "DISABLE_APP"
          ) {
            void refreshApps();
          }
        }
        return;
      }
      if (event.type === "DeviceEvent" && event.kind === "APP_CHANGED") {
        void refreshApps();
      }
    },
  });

  async function createCommand(type: "INSTALL_APP" | "UNINSTALL_APP" | "ENABLE_APP" | "DISABLE_APP", packageName: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/families/${familyId}/devices/${deviceId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        payload: { packageName },
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      setPending(false);
      return;
    }

    const body = (await response.json()) as { command: CommandView };
    setCommands((current) => [body.command, ...current.filter((item) => item.id !== body.command.id)]);
    setActiveCommandId(body.command.id);
    setInstallOpen(false);
    setUninstallTarget(null);
    setSelectedPackage("");
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {activeCommandId ? <Alert severity="info">{copy.waitingForDevice}</Alert> : null}

      {canManage && capabilities.INSTALL_APP ? (
        <Button
          variant="contained"
          onClick={() => setInstallOpen(true)}
          disabled={pending || catalog.length === 0}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
        >
          {copy.installApp}
        </Button>
      ) : null}

      {apps.length === 0 ? <Typography color="text.secondary">{copy.appsEmpty}</Typography> : null}

      <Stack spacing={1.5}>
        {apps.map((app) => (
          <Paper key={app.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Avatar src={app.iconUrl ?? undefined} variant="rounded" sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
                  <AppsOutlinedIcon />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap>{app.label}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {app.packageName}
                  </Typography>
                </Box>
                <Chip label={deviceAppStateLabels[app.state]} size="small" color={app.state === "ENABLED" ? "success" : "default"} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {copy.appVersion}: {app.versionName ?? copy.valueUnknown}
              </Typography>
              {app.isSystem ? (
                <Typography variant="caption" color="text.secondary">
                  {copy.systemAppHint}
                </Typography>
              ) : null}
              {canManage ? (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {capabilities.UNINSTALL_APP && app.canUninstall && !app.isSystem ? (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={pending}
                      onClick={() => setUninstallTarget(app)}
                    >
                      {copy.uninstallApp}
                    </Button>
                  ) : null}
                  {capabilities.DISABLE_APP && app.canDisable && app.state === "ENABLED" ? (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={pending}
                      onClick={() => createCommand("DISABLE_APP", app.packageName)}
                    >
                      {copy.disableApp}
                    </Button>
                  ) : null}
                  {capabilities.ENABLE_APP && app.canDisable && app.state === "DISABLED" ? (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={pending}
                      onClick={() => createCommand("ENABLE_APP", app.packageName)}
                    >
                      {copy.enableApp}
                    </Button>
                  ) : null}
                  {!app.canUninstall || app.isSystem ? (
                    <Typography variant="caption" color="text.secondary">
                      {copy.unsupportedAction}
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {copy.recentCommands}
        </Typography>
        {commands.length === 0 ? <Typography color="text.secondary">{copy.valueUnknown}</Typography> : null}
        <Stack spacing={1}>
          {commands.map((command) => (
            <Stack
              key={command.id}
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {commandTypeLabels[command.type]}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {typeof command.payload.packageName === "string" ? command.payload.packageName : ""}
                </Typography>
              </Box>
              <Chip size="small" label={commandStatusLabels[command.status]} color={commandStatusColor(command.status)} />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Dialog open={installOpen} onClose={() => setInstallOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{copy.installApp}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {catalog.length === 0 ? (
              <Typography color="text.secondary">{copy.noInstallCandidates}</Typography>
            ) : (
              <TextField
                select
                label={copy.selectAppToInstall}
                value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.target.value)}
                fullWidth
              >
                {catalog.map((entry) => (
                  <MenuItem key={entry.id} value={entry.packageName}>
                    {entry.label} ({entry.packageName})
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallOpen(false)}>{copy.cancelAction}</Button>
          <Button
            variant="contained"
            disabled={!selectedPackage || pending}
            onClick={() => createCommand("INSTALL_APP", selectedPackage)}
          >
            {copy.installApp}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(uninstallTarget)} onClose={() => setUninstallTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{copy.confirmUninstallTitle}</DialogTitle>
        <DialogContent>
          <Typography>
            {copy.confirmUninstallBody}
            {uninstallTarget ? ` (${uninstallTarget.label})` : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallTarget(null)}>{copy.cancelAction}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!uninstallTarget || pending}
            onClick={() => uninstallTarget && createCommand("UNINSTALL_APP", uninstallTarget.packageName)}
          >
            {copy.confirmAction}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
