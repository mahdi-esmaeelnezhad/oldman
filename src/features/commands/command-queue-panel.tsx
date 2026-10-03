"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { messageForApiError } from "@/config/api-errors";
import { commandStatusLabels, copy } from "@/config/copy";
import { commandStatusColor, isActiveCommand, isCancellableCommand } from "@/features/commands/command-status";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import { formatDateTime } from "@/lib/format-date-time";
import type { CommandView } from "@/server/commands/command-service";

type CommandQueuePanelProps = {
  familyId: string;
  deviceId: string;
  canManage: boolean;
  initialCommands: CommandView[];
};

export function CommandQueuePanel({
  familyId,
  deviceId,
  canManage,
  initialCommands,
}: CommandQueuePanelProps) {
  const [commands, setCommands] = useState(initialCommands);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useFamilyRealtime({
    familyId,
    deviceId,
    onEvent: (event) => {
      if (event.type !== "CommandResult") {
        return;
      }
      const next: CommandView = {
        commandId: event.command.commandId,
        id: event.command.commandId,
        familyId: event.command.familyId,
        deviceId: event.command.deviceId,
        createdBy: event.command.createdBy,
        type: event.command.type,
        payload: event.command.payload,
        status: event.command.status,
        resultData: event.command.resultData ?? null,
        errorCode: event.command.errorCode ?? null,
        errorMessage: event.command.errorMessage ?? null,
        createdAt: event.command.createdAt,
        expiresAt: event.command.expiresAt,
        sentAt: null,
        receivedAt: null,
        startedAt: null,
        completedAt: event.command.completedAt ?? null,
      };
      setCommands((current) => {
        const without = current.filter((item) => item.id !== next.id);
        return [next, ...without].slice(0, 50);
      });
    },
  });

  async function cancelCommand(commandId: string) {
    setPendingId(commandId);
    setError(null);
    const response = await fetch(
      `/api/families/${familyId}/devices/${deviceId}/commands/${commandId}`,
      { method: "DELETE" },
    );
    setPendingId(null);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { code?: string } };
      setError(messageForApiError(body.error?.code));
      return;
    }
    const body = (await response.json()) as { command: CommandView };
    setCommands((current) => {
      const without = current.filter((item) => item.id !== body.command.id);
      return [body.command, ...without];
    });
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {commands.some((command) => isActiveCommand(command.status)) ? (
        <Alert severity="info">{copy.waitingForDevice}</Alert>
      ) : null}
      {commands.length === 0 ? (
        <Typography color="text.secondary">{copy.commandsEmpty}</Typography>
      ) : (
        <Stack spacing={1.5}>
          {commands.map((command) => (
            <Paper key={command.commandId} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography>{command.type}</Typography>
                  <Chip
                    size="small"
                    label={commandStatusLabels[command.status]}
                    color={commandStatusColor(command.status)}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {copy.commandId}: {command.commandId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.createdAt}: {formatDateTime(new Date(command.createdAt))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.expiresAt}: {formatDateTime(new Date(command.expiresAt))}
                </Typography>
                {canManage && isCancellableCommand(command.status) ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={pendingId === command.id}
                    onClick={() => cancelCommand(command.id)}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {copy.cancelCommand}
                  </Button>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
