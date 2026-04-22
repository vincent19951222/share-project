"use client";

import type { BoardNoteDto } from "@/lib/board-notes";
import { NoteCard } from "./NoteCard";

interface NoteMasonryProps {
  notes: BoardNoteDto[];
  deletingIds: Set<string>;
  onDelete: (id: string) => void;
}

export function NoteMasonry({ notes, deletingIds, onDelete }: NoteMasonryProps) {
  if (notes.length === 0) {
    return (
      <div className="soft-card p-8 text-center">
        <p className="text-xl font-black text-main">还没人贴便签</p>
        <p className="mt-2 text-sm font-bold text-sub">先来一张，给今天的团队小墙开个张。</p>
      </div>
    );
  }

  return (
    <div className="note-masonry">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          deleting={deletingIds.has(note.id)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
