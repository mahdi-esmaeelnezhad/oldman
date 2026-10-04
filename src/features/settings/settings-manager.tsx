"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { deviceSettingSections } from "@/config/device-settings";
import { commandStatusColor, isActiveCommand } from "@/features/commands/command-status";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import type { CommandView } from "@/server/commands/command-service";
import type { DeviceSettingView } from "@/server/settings/settings-service";
import type { DeviceCapability } from "@/types/contracts/device-capability";
import type { JsonSettingValue } from "@/types/contracts/command";
import type { DeviceSettingSection } from "@/generated/prisma/enums";
import type { RealtimeCommandSnapshot } from "@/types/contracts/family-realtime-event";

type SettingsManagerProps = {
  familyId: string;
  deviceId: string;
  canManage: boolean;
  capabilities: DeviceCapability;
  initialSettings: DeviceSettingView[];
  initialCommands: CommandView[];
};

function toCommandView(command: RealtimeCommandSnapshot): CommandView {
  return {
    commandId: command.commandId,
    id: command.commandId,
    familyId: command.familyId,
    deviceId: command.deviceId,
    createdBy: command.createdBy,
    type: command.type,
    payload: command.payload,
    status: command.status,
    resultData: command.resultData ?? null,
    errorCode: command.errorCode ?? null,
    errorMessage: command.errorMessage ?? null,
    createdAt: command.createdAt,
    expiresAt: command.expiresAt,
    sentAt: null,
    receivedAt: null,
    startedAt: null,
    completedAt: command.completedAt ?? null,
  };
}

export function SettingsManager({
  familyId,
  deviceId,
  canManage,
  capabilities,
  initialSettings,
  initialCommands,
}: SettingsManagerProps) {
  const {
    copy,
    commandStatusLabels,
    commandTypeLabels,
    deviceSettingKeyLabels,
    deviceSettingSectionLabels,
    messageForApiError,
  } = useI18n();

  function settingLabel(key: string): string {
    if (key in deviceSettingKeyLabels) {
      return deviceSettingKeyLabels[key as keyof typeof deviceSettingKeyLabels];
    }
    return key;
  }

  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [draftValues, setDraftValues] = useState<Record<string, JsonSettingValue>>(() =>
    Object.fromEntries(initialSettings.map((setting) => [setting.key, setting.value])),
  );
  const [commands, setCommands] = useState(initialCommands);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(
    initialCommands.find((command) => isActiveCommand(command.status))?.id ?? null,
  );

  const settingsBySection = useMemo(() => {
    const map = new Map<DeviceSettingSection, DeviceSettingView[]>();
    for (const section of deviceSettingSections) {
      const items = settings.filter((setting) => setting.section === section);
      if (items.length > 0) {
        map.set(section, items);
      }
    }
    return map;
  }, [settings]);

  async function refreshSettings() {
    const pageResponse = await fetch(`/api/families/${familyId}/devices/${deviceId}/settings`);
    if (!pageResponse.ok) {
      return;
    }
    const pageBody = (await pageResponse.json()) as { settings: DeviceSettingView[] };
    setSettings(pageBody.settings);
    setDraftValues(Object.fromEntries(pageBody.settings.map((setting) => [setting.key, setting.value])));
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
          if (next.type === "GET_SETTINGS" || next.type === "SET_SETTING") {
            void refreshSettings();
          }
        }
        return;
      }
      if (event.type === "DeviceEvent" && event.kind === "SETTING_CHANGED") {
        void refreshSettings();
      }
    },
  });

  async function submitCommand(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/families/${familyId}/devices/${deviceId}/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setPending(false);
      const errorBody = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(errorBody.error?.code));
      return;
    }
    const result = (await response.json()) as { command: CommandView };
    setCommands((current) =>
      [result.command, ...current.filter((item) => item.id !== result.command.id)].slice(0, 20),
    );
    setActiveCommandId(result.command.id);
  }

  async function requestSettingsRefresh() {
    await submitCommand({ type: "GET_SETTINGS", payload: {} });
  }

  async function applySetting(setting: DeviceSettingView) {
    if (!setting.active) {
      return;
    }
    const value = draftValues[setting.key];
    await submitCommand({
      type: "SET_SETTING",
      payload: { key: setting.key, value },
    });
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {activeCommandId ? <Alert severity="info">{copy.waitingForDevice}</Alert> : null}

      {!capabilities.GET_SETTINGS ? (
        <Alert severity="warning">{copy.settingsUnsupported}</Alert>
      ) : (
        <Stack direction="row" spacing={1}>
          {canManage ? (
            <Button variant="outlined" disabled={pending} onClick={requestSettingsRefresh}>
              {copy.refreshSettings}
            </Button>
          ) : null}
        </Stack>
      )}

      {settings.length === 0 ? (
        <Typography color="text.secondary">{copy.settingsEmpty}</Typography>
      ) : (
        [...settingsBySection.entries()].map(([section, items]) => (
          <Paper key={section} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {deviceSettingSectionLabels[section]}
            </Typography>
            <Stack spacing={2}>
              {items.map((setting) => {
                const draft = draftValues[setting.key];
                const controlDisabled = !setting.active || pending;

                return (
                  <Stack key={setting.key} spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography>{settingLabel(setting.key)}</Typography>
                      {!setting.active ? (
                        <Chip
                          size="small"
                          label={setting.writable ? copy.settingInactive : copy.settingReadOnly}
                        />
                      ) : null}
                    </Stack>
                    {setting.valueType === "boolean" ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(draft)}
                            disabled={controlDisabled}
                            onChange={(event) =>
                              setDraftValues((current) => ({
                                ...current,
                                [setting.key]: event.target.checked,
                              }))
                            }
                          />
                        }
                        label={Boolean(draft) ? copy.enabled : copy.disabled}
                      />
                    ) : (
                      <TextField
                        type={setting.valueType === "number" ? "number" : "text"}
                        value={draft ?? ""}
                        disabled={controlDisabled}
                        onChange={(event) =>
                          setDraftValues((current) => ({
                            ...current,
                            [setting.key]:
                              setting.valueType === "number"
                                ? Number(event.target.value)
                                : event.target.value,
                          }))
                        }
                      />
                    )}
                    {setting.active ? (
                      <Button size="small" variant="contained" disabled={pending} onClick={() => applySetting(setting)}>
                        {copy.saveSetting}
                      </Button>
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        ))
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {copy.recentCommands}
        </Typography>
        {commands.length === 0 ? (
          <Typography color="text.secondary">{copy.valueUnknown}</Typography>
        ) : (
          <Stack spacing={1}>
            {commands.map((command) => (
              <Stack key={command.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2">{commandTypeLabels[command.type]}</Typography>
                <Chip size="small" label={commandStatusLabels[command.status]} color={commandStatusColor(command.status)} />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
