"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardNoteColor, BoardNoteDto, BoardNoteType } from "@/lib/board-notes";
import { useBoard } from "@/lib/store";
import { NoteComposer } from "./NoteComposer";
import { NoteMasonry } from "./NoteMasonry";
import { SyncStatus } from "./SyncStatus";

type SyncState = "idle" | "syncing" | "error";
type BoardMessage = {
  tone: "success" | "error";
  text: string;
};

export function SharedBoard({ isActive = true }: { isActive?: boolean }) {
  const { state } = useBoard();
  const [notes, setNotes] = useState<BoardNoteDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<BoardMessage | null>(null);

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

  useEffect(() => {
    if (!isActive) return;

    const handleProfileUpdated = () => {
      void fetchNotes();
    };

    window.addEventListener("board:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("board:profile-updated", handleProfileUpdated);
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
      setMessage({ tone: "success", text: "已发布到共享看板" });
      void fetchNotes();
      return true;
    } catch {
      setMessage({ tone: "error", text: "发布失败，请稍后再试" });
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
      setMessage({ tone: "error", text: "删除失败，请稍后再试" });
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section className="shared-board-scene h-full overflow-y-auto no-scrollbar">
      <div className="shared-board-background" aria-hidden="true">
        <div className="shared-board-wall-bg" />
      </div>

      <div className="shared-board-props" aria-hidden="true">
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_poster_no_excuses.webp"
          alt=""
          className="shared-board-prop shared-board-poster-left"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_poster_focus_train_win.webp"
          alt=""
          className="shared-board-prop shared-board-poster-right"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_discipline_note.webp"
          alt=""
          className="shared-board-prop shared-board-discipline-note"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_dumbbell_edge.webp"
          alt=""
          className="shared-board-prop shared-board-dumbbell"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_marker_pen.webp"
          alt=""
          className="shared-board-prop shared-board-marker"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_paperclip.webp"
          alt=""
          className="shared-board-prop shared-board-paperclip"
        />
      </div>

      <div className="shared-board-content">
        <div className="shared-board-wall-set">
          <div className="shared-board-composer-wrap">
            <div className="shared-board-sync-row">
              <SyncStatus state={syncState} />
            </div>
            <img
              src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_clipboard_clip.webp"
              alt=""
              className="shared-board-clip"
              aria-hidden="true"
            />
            <NoteComposer
              currentUser={{
                name: currentMember.name,
                avatarKey: currentMember.avatarKey,
              }}
              submitting={submitting}
              onSubmit={createNote}
            />

            {message ? (
              <div className={`shared-board-message shared-board-${message.tone}-row`}>
                <span aria-hidden="true">{message.tone === "success" ? "✓" : "!"}</span>
                <span>{message.text}</span>
              </div>
            ) : null}
          </div>

          <div className="shared-board-cork">
            <NoteMasonry notes={notes} deletingIds={deletingIds} onDelete={deleteNote} />
          </div>
        </div>
      </div>
    </section>
  );
}
