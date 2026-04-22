"use client";

import { useMemo, useState } from "react";
import type { BoardNoteColor, BoardNoteType } from "@/lib/board-notes";
import { BOARD_NOTE_MAX_LENGTH } from "@/lib/board-notes";
import { getAvatarUrl } from "@/lib/avatars";

const COLORS: Array<{ value: BoardNoteColor; className: string; label: string }> = [
  { value: "YELLOW", className: "bg-yellow-200", label: "黄色" },
  { value: "BLUE", className: "bg-blue-200", label: "蓝色" },
  { value: "GREEN", className: "bg-green-200", label: "绿色" },
  { value: "PINK", className: "bg-pink-200", label: "粉色" },
];

interface NoteComposerProps {
  currentUser: {
    name: string;
    avatarKey: string;
  };
  submitting: boolean;
  onSubmit: (input: { type: BoardNoteType; content: string; color: BoardNoteColor | null }) => Promise<boolean>;
}

export function NoteComposer({ currentUser, submitting, onSubmit }: NoteComposerProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<BoardNoteType>("FREE");
  const [color, setColor] = useState<BoardNoteColor>("YELLOW");
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = content.trim().length;
  const isTooLong = content.length > BOARD_NOTE_MAX_LENGTH;
  const canSubmit = useMemo(
    () => trimmedLength > 0 && !isTooLong && !submitting,
    [trimmedLength, isTooLong, submitting],
  );

  async function submit() {
    if (trimmedLength === 0) {
      setError("先写点内容再发布。");
      return;
    }

    if (isTooLong) {
      setError(`内容不能超过 ${BOARD_NOTE_MAX_LENGTH} 字。`);
      return;
    }

    setError(null);
    const ok = await onSubmit({
      type,
      content,
      color: type === "FREE" ? color : null,
    });

    if (ok) {
      setContent("");
      setType("FREE");
      setColor("YELLOW");
    }
  }

  return (
    <section className="soft-card mb-4 p-6">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-blue-100 shadow-sm">
          <img
            src={getAvatarUrl(currentUser.avatarKey)}
            alt={currentUser.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="分享你的想法、训练心得、约饭约练或团队提醒..."
            className="shared-note-input"
            rows={4}
            maxLength={BOARD_NOTE_MAX_LENGTH + 1}
          />

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-sub">
                类型:
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as BoardNoteType)}
                  className="shared-note-select"
                >
                  <option value="FREE">自由笔记</option>
                  <option value="ANNOUNCEMENT">团队通告</option>
                </select>
              </label>

              <div className={`flex items-center gap-2 ${type === "ANNOUNCEMENT" ? "opacity-50" : ""}`}>
                <span className="text-xs font-bold text-sub">颜色:</span>
                <div className="flex gap-1">
                  {COLORS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`color-option ${item.className} ${color === item.value ? "selected" : ""}`}
                      onClick={() => setColor(item.value)}
                      disabled={type === "ANNOUNCEMENT"}
                      aria-label={item.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="quest-btn min-w-24 gap-2 px-6 py-2 text-sm"
              onClick={() => void submit()}
              disabled={!canSubmit}
            >
              {submitting ? "发布中" : "发布"}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="min-h-4 text-xs font-bold text-red-500">{error}</p>
            <p className={`text-xs font-bold ${isTooLong ? "text-red-500" : "text-sub"}`}>
              {content.length}/{BOARD_NOTE_MAX_LENGTH}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
