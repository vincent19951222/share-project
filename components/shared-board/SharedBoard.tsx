"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardNoteColor, BoardNoteDto, BoardNoteType } from "@/lib/board-notes";
import { useBoard } from "@/lib/store";
import { NoteComposer } from "./NoteComposer";
import { NoteMasonry } from "./NoteMasonry";
import { SyncStatus } from "./SyncStatus";

type SyncState = "idle" | "syncing" | "error";

export function SharedBoard() {
  const { state } = useBoard();
  const [notes, setNotes] = useState<BoardNoteDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const isActive = state.activeTab === "board";

  const currentMember = useMemo(
    () => state.members.find((member) => member.id === state.currentUserId) ?? state.members[0],
    [state.currentUserId, state.members],
  );

  const fetchNotes = useCallback(async () => {
    setSyncState("syncing");

    try {
      const response = await fetch("/api/board-notes", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const body = await response.json() as { notes: BoardNoteDto[] };
      setNotes(body.notes);
      setSyncState("idle");
    } catch {
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    void fetchNotes();
    const timer = window.setInterval(() => {
      void fetchNotes();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [fetchNotes, isActive]);

  async function createNote(input: { type: BoardNoteType; content: string; color: BoardNoteColor | null }) {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/board-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to publish note");
      }

      const body = await response.json() as { note: BoardNoteDto };
      setNotes((current) => [body.note, ...current.filter((note) => note.id !== body.note.id)]);
      void fetchNotes();
      return true;
    } catch {
      setMessage("发布失败，请稍后再试");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: string) {
    setDeletingIds((current) => new Set(current).add(id));
    setMessage(null);

    try {
      const response = await fetch(`/api/board-notes/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      setNotes((current) => current.filter((note) => note.id !== id));
      void fetchNotes();
    } catch {
      setMessage("删除失败，请稍后再试");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section className="h-full overflow-y-auto p-4 no-scrollbar">
      <div className="mb-3 flex justify-end">
        <SyncStatus state={syncState} />
      </div>

      <NoteComposer
        currentUser={{
          name: currentMember.name,
          avatarKey: currentMember.avatarKey,
        }}
        submitting={submitting}
        onSubmit={createNote}
      />

      {message && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
          {message}
        </div>
      )}

      <NoteMasonry notes={notes} deletingIds={deletingIds} onDelete={deleteNote} />
    </section>
  );
}
