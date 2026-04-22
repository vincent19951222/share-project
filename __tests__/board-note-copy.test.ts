import { describe, expect, it, vi } from "vitest";
import {
  BOARD_NOTE_MAX_LENGTH,
  formatRelativeTime,
  normalizeBoardNoteInput,
} from "@/lib/board-notes";

describe("board note copy", () => {
  it("returns readable validation messages", () => {
    expect(normalizeBoardNoteInput(null)).toEqual({
      ok: false,
      error: "请求内容无效",
    });

    expect(normalizeBoardNoteInput({
      type: "TASK",
      content: "今天练腿",
      color: "YELLOW",
    })).toEqual({
      ok: false,
      error: "无效的便签类型",
    });

    expect(normalizeBoardNoteInput({
      type: "FREE",
      content: "x".repeat(BOARD_NOTE_MAX_LENGTH + 1),
      color: "YELLOW",
    })).toEqual({
      ok: false,
      error: `内容不能超过 ${BOARD_NOTE_MAX_LENGTH} 字`,
    });
  });

  it("formats same-day timestamps with relative copy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));

    expect(formatRelativeTime(new Date("2026-04-22T11:59:31+08:00"))).toBe("刚刚");
    expect(formatRelativeTime(new Date("2026-04-22T11:59:00+08:00"))).toBe("1分钟前");
    expect(formatRelativeTime(new Date("2026-04-22T10:00:00+08:00"))).toBe("2小时前");

    vi.useRealTimers();
  });

  it("formats yesterday timestamps as yesterday plus time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));

    expect(formatRelativeTime(new Date("2026-04-21T21:35:00+08:00"))).toBe("昨天 21:35");

    vi.useRealTimers();
  });

  it("formats earlier dates in the same year as month-day plus time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));

    expect(formatRelativeTime(new Date("2026-03-05T08:09:00+08:00"))).toBe("03-05 08:09");

    vi.useRealTimers();
  });

  it("formats previous-year dates with full year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00+08:00"));

    expect(formatRelativeTime(new Date("2025-12-30T21:35:00+08:00"))).toBe("2025-12-30 21:35");

    vi.useRealTimers();
  });
});
