import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import type { CoffeeSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function snapshot(cups: number): CoffeeSnapshot {
  return {
    members: [{ id: "u1", name: "li", avatarKey: "male1" }],
    gridData: [[{ cups: 0 }, { cups }]],
    today: 2,
    totalDays: 2,
    currentUserId: "u1",
    stats: {
      todayTotalCups: cups,
      todayDrinkers: cups > 0 ? 1 : 0,
      currentUserTodayCups: cups,
      coffeeKing: cups > 0 ? { userId: "u1", name: "li", cups } : null,
    },
  };
}

describe("CoffeeCheckin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads coffee state and can add or remove today's cups", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(0) }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(1) }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ snapshot: snapshot(0) }) }),
    );

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("今日咖啡小票");
    expect(container.textContent).toContain("今天还没续命");

    const removeButtonAtZero = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect((removeButtonAtZero as HTMLButtonElement | undefined)?.disabled).toBe(true);

    const addButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("+1 杯"),
    );
    expect(addButton).toBeDefined();

    await act(async () => {
      addButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("我的今日杯数");
    expect(container.textContent).toContain("☕ 1");

    const removeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect(removeButton).toBeDefined();
    expect((removeButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      removeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups/latest",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows an actionable error when the initial coffee state is unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "未登录" }),
      }),
    );

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("咖啡小票没打出来");
    expect(container.textContent).toContain("登录状态过期，请重新登录。");
    expect(container.textContent).toContain("重新登录");
    expect(container.textContent).not.toContain("正在打印今日咖啡小票");
  });
});
