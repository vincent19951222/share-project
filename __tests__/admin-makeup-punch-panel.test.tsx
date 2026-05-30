import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMakeupPunchPanel } from "@/components/admin/AdminMakeupPunchPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const members = [
  { id: "user-1", name: "Li" },
  { id: "user-2", name: "Luo" },
];

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("AdminMakeupPunchPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("submits the selected member and day to the admin makeup API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(
        <AdminMakeupPunchPanel members={members} defaultDayKey="2026-04-10" />,
      );
    });

    const select = container.querySelector<HTMLSelectElement>('select[name="targetUserId"]');
    const dateInput = container.querySelector<HTMLInputElement>('input[name="dayKey"]');

    expect(container.textContent).toContain("全局补卡");
    expect(select).not.toBeNull();
    expect(dateInput).not.toBeNull();

    await act(async () => {
      select!.value = "user-2";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
      dateInput!.value = "2026-04-10";
      dateInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认补卡"),
    );

    await act(async () => {
      submitButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/board/makeup-punch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetUserId: "user-2", dayKey: "2026-04-10" }),
      }),
    );
    expect(container.textContent).toContain("已给 Luo 补卡");
  });

  it("shows a readable backend error when admin makeup is rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "duplicate-punch" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(
        <AdminMakeupPunchPanel members={members} defaultDayKey="2026-04-10" />,
      );
    });

    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认补卡"),
    );

    await act(async () => {
      submitButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushPromises();
    });

    expect(container.textContent).toContain("这一天已经有打卡记录了");
  });
});
