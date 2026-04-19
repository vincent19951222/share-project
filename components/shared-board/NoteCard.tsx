"use client";

import type { BoardNoteDto } from "@/lib/board-notes";
import { formatRelativeTime } from "@/lib/board-notes";
import { getAvatarUrl } from "@/lib/avatars";

const COLOR_CLASS = {
  YELLOW: "note-free-yellow",
  BLUE: "note-free-blue",
  GREEN: "note-free-green",
  PINK: "note-free-pink",
} as const;

interface NoteCardProps {
  note: BoardNoteDto;
  deleting?: boolean;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, deleting = false, onDelete }: NoteCardProps) {
  const isAnnouncement = note.type === "ANNOUNCEMENT";
  const colorClass = isAnnouncement ? "note-announcement" : COLOR_CLASS[note.color ?? "YELLOW"];

  return (
    <article className={`note-card ${colorClass} ${deleting ? "opacity-60 pointer-events-none" : ""}`}>
      {note.canDelete && (
        <button
          type="button"
          className="note-close-btn"
          onClick={() => onDelete(note.id)}
          aria-label="删除便签"
          disabled={deleting}
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-3 mb-3 pr-9">
        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center border-2 border-slate-300 shadow-sm shrink-0 overflow-hidden">
          <img
            src={getAvatarUrl(note.author.avatarKey)}
            alt={note.author.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-sm text-main truncate max-w-[9rem]">{note.author.name}</span>
            <span className={`type-badge ${isAnnouncement ? "badge-announcement" : "badge-free"}`}>
              {isAnnouncement ? "团队通告" : "自由笔记"}
            </span>
          </div>
          <span className="text-xs text-sub font-bold">{formatRelativeTime(note.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm font-bold text-main leading-relaxed whitespace-pre-wrap break-words">
        {note.content}
      </p>
    </article>
  );
}
