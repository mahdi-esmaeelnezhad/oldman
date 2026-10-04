"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { messageForApiError } from "@/config/api-errors";
import { commandStatusLabels, commandTypeLabels, copy } from "@/config/copy";
import { commandStatusColor, isActiveCommand } from "@/features/commands/command-status";
import { useFamilyRealtime } from "@/features/realtime/use-family-realtime";
import type { DeviceContactView } from "@/server/contacts/contact-service";
import type { CommandView } from "@/server/commands/command-service";
import type { DeviceCapability } from "@/types/contracts/device-capability";
import type { RealtimeCommandSnapshot } from "@/types/contracts/family-realtime-event";

type ContactsManagerProps = {
  familyId: string;
  deviceId: string;
  canManage: boolean;
  capabilities: DeviceCapability;
  initialContacts: DeviceContactView[];
  initialCommands: CommandView[];
  initialSearch: string;
};

type DraftContact = {
  contactId?: string;
  displayName: string;
  phoneNumber: string;
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

export function ContactsManager({
  familyId,
  deviceId,
  canManage,
  capabilities,
  initialContacts,
  initialCommands,
  initialSearch,
}: ContactsManagerProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [commands, setCommands] = useState(initialCommands);
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceContactView | null>(null);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(
    initialCommands.find((command) => isActiveCommand(command.status))?.id ?? null,
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return contacts;
    }
    return contacts.filter(
      (contact) =>
        contact.displayName.toLowerCase().includes(query) ||
        contact.phoneNumber.toLowerCase().includes(query),
    );
  }, [contacts, search]);

  async function refreshContacts() {
    const response = await fetch(`/api/families/${familyId}/devices/${deviceId}/contacts`);
    if (!response.ok) {
      return;
    }
    const body = (await response.json()) as { contacts: DeviceContactView[] };
    setContacts(body.contacts);
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
            next.type === "CREATE_CONTACT" ||
            next.type === "UPDATE_CONTACT" ||
            next.type === "DELETE_CONTACT"
          ) {
            void refreshContacts();
          }
        }
        return;
      }
      if (event.type === "DeviceEvent" && event.kind === "CONTACT_CHANGED") {
        void refreshContacts();
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

  function openCreate() {
    setDraft({ displayName: "", phoneNumber: "" });
    setEditorOpen(true);
  }

  function openEdit(contact: DeviceContactView) {
    setDraft({
      contactId: contact.contactId,
      displayName: contact.displayName,
      phoneNumber: contact.phoneNumber,
    });
    setEditorOpen(true);
  }

  async function saveDraft() {
    if (!draft || !draft.displayName.trim() || !draft.phoneNumber.trim()) {
      setError(messageForApiError("VALIDATION_ERROR"));
      return;
    }

    if (draft.contactId) {
      await submitCommand({
        type: "UPDATE_CONTACT",
        payload: {
          contactId: draft.contactId,
          displayName: draft.displayName.trim(),
          phoneNumber: draft.phoneNumber.trim(),
        },
      });
    } else {
      await submitCommand({
        type: "CREATE_CONTACT",
        payload: {
          displayName: draft.displayName.trim(),
          phoneNumber: draft.phoneNumber.trim(),
        },
      });
    }
    setEditorOpen(false);
    setDraft(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    await submitCommand({
      type: "DELETE_CONTACT",
      payload: { contactId: deleteTarget.contactId },
    });
    setDeleteTarget(null);
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {activeCommandId ? <Alert severity="info">{copy.waitingForDevice}</Alert> : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        <TextField
          label={copy.searchContacts}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />
        {canManage && capabilities.CREATE_CONTACT ? (
          <Button variant="contained" onClick={openCreate} disabled={pending}>
            {copy.addContact}
          </Button>
        ) : null}
      </Stack>

      {filteredContacts.length === 0 ? (
        <Typography color="text.secondary">{copy.contactsEmpty}</Typography>
      ) : (
        <Stack spacing={1.5}>
          {filteredContacts.map((contact) => (
            <Paper key={contact.contactId} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Typography>{contact.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {contact.phoneNumber}
                </Typography>
                {canManage ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {capabilities.UPDATE_CONTACT ? (
                      <Button size="small" variant="outlined" disabled={pending} onClick={() => openEdit(contact)}>
                        {copy.editContact}
                      </Button>
                    ) : null}
                    {capabilities.DELETE_CONTACT ? (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={pending}
                        onClick={() => setDeleteTarget(contact)}
                      >
                        {copy.deleteContact}
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
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

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{draft?.contactId ? copy.editContact : copy.addContact}</DialogTitle>
        <DialogContent>
          {draft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label={copy.contactDisplayName}
                value={draft.displayName}
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                required
              />
              <TextField
                label={copy.contactPhoneNumber}
                value={draft.phoneNumber}
                onChange={(event) => setDraft({ ...draft, phoneNumber: event.target.value })}
                required
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>{copy.cancelAction}</Button>
          <Button variant="contained" disabled={pending} onClick={saveDraft}>
            {copy.saveContact}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{copy.deleteContact}</DialogTitle>
        <DialogContent>
          <Typography>{copy.confirmDeleteContactBody}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{copy.cancelAction}</Button>
          <Button color="error" variant="contained" disabled={pending} onClick={confirmDelete}>
            {copy.deleteContact}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
