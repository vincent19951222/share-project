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
    <section className="shared-board-composer">
      <div className="shared-board-composer-grid">
        <div className="shared-board-composer-avatar flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-blue-100 shadow-sm">
          <img
            src={getAvatarUrl(currentUser.avatarKey)}
            alt={currentUser.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="shared-board-input-panel">
          <div className="shared-note-input-wrap">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="说点什么吧..."
              className="shared-note-input"
              rows={4}
              maxLength={BOARD_NOTE_MAX_LENGTH + 1}
            />
            <p className={`shared-board-counter ${isTooLong ? "text-red-500" : "text-sub"}`}>
              {content.length}/{BOARD_NOTE_MAX_LENGTH}
            </p>
          </div>
          <p className="shared-board-inline-error text-xs font-bold text-red-500">{error}</p>
        </div>

        <div className="shared-board-controls-panel">
          <div className="shared-board-control-stack">
            <div className="shared-board-control-row">
              <span className="text-xs font-bold text-sub">类型:</span>
              <div className="shared-board-type-toggle" role="group" aria-label="便签类型">
                <button
                  type="button"
                  className={type === "FREE" ? "selected" : ""}
                  onClick={() => setType("FREE")}
                  aria-pressed={type === "FREE"}
                  disabled={submitting}
                >
                  自由笔记
                </button>
                <button
                  type="button"
                  className={type === "ANNOUNCEMENT" ? "selected" : ""}
                  onClick={() => setType("ANNOUNCEMENT")}
                  aria-pressed={type === "ANNOUNCEMENT"}
                  disabled={submitting}
                >
                  团队通告
                </button>
              </div>
            </div>

            <div className={`shared-board-control-row ${type === "ANNOUNCEMENT" ? "opacity-50" : ""}`}>
              <span className="text-xs font-bold text-sub">颜色:</span>
              <div className="flex gap-1">
                {COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`shared-board-color-chip ${item.className} ${color === item.value ? "selected" : ""}`}
                    onClick={() => setColor(item.value)}
                    disabled={type === "ANNOUNCEMENT"}
                    aria-pressed={color === item.value}
                    aria-label={item.label}
                  >
                    <span aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="quest-btn shared-board-publish-btn min-w-24 gap-2 px-6 py-2 text-sm"
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            <span aria-hidden="true">➤</span>
            {submitting ? "发布中" : "发布"}
          </button>
        </div>
      </div>
    </section>
  );
}
