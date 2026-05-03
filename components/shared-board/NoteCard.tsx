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

const PIN_ASSETS = [
  "/assets/home-scenes/shared-board/pushpin-red.webp",
  "/assets/home-scenes/shared-board/pushpin-blue.webp",
  "/assets/home-scenes/shared-board/pushpin-yellow.webp",
] as const;

interface NoteCardProps {
  note: BoardNoteDto;
  deleting?: boolean;
  onDelete: (id: string) => void;
}

function getPinSrc(note: BoardNoteDto) {
  const hashSource = `${note.author.id}:${note.id}`;
  const hash = Array.from(hashSource).reduce((total, char) => total + char.charCodeAt(0), 0);
  return PIN_ASSETS[hash % PIN_ASSETS.length];
}

export function NoteCard({ note, deleting = false, onDelete }: NoteCardProps) {
  const isAnnouncement = note.type === "ANNOUNCEMENT";
  const colorClass = isAnnouncement ? "note-announcement" : COLOR_CLASS[note.color ?? "YELLOW"];
  const shouldTape = isAnnouncement || note.color === "PINK" || note.color === "GREEN";

  return (
    <article className={`note-card ${colorClass} ${deleting ? "pointer-events-none opacity-60" : ""}`}>
      {!isAnnouncement && (
        <img className="note-pin" src={getPinSrc(note)} alt="" aria-hidden="true" />
      )}
      {shouldTape && (
        <img
          className="note-tape"
          src="/assets/home-scenes/shared-board/paper-tape.webp"
          alt=""
          aria-hidden="true"
        />
      )}
      <span className="note-fold" aria-hidden="true" />
      {isAnnouncement && (
        <>
          <span className="note-announcement-ribbon">团队通告</span>
          <span className="note-announcement-rule" aria-hidden="true" />
        </>
      )}

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

      <div className="mb-3 flex items-start gap-3 pr-9">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-300 bg-white/80 shadow-sm">
          <img
            src={getAvatarUrl(note.author.avatarKey)}
            alt={note.author.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="max-w-[9rem] truncate text-sm font-bold text-main">{note.author.name}</span>
            <span className={`type-badge ${isAnnouncement ? "badge-announcement" : "badge-free"}`}>
              {isAnnouncement ? "团队通告" : "自由笔记"}
            </span>
          </div>
          <span className="text-xs font-bold text-sub">{formatRelativeTime(note.createdAt)}</span>
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-main">
        {note.content}
      </p>
    </article>
  );
}
