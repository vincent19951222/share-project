import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeasonAdminPanel, type SeasonListItem } from "@/components/admin/SeasonAdminPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialSeasons: SeasonListItem[] = [
  {
    id: "season-active",
    teamId: "team-1",
    monthKey: "2026-04",
    goalName: "五月掉脂挑战",
    targetSlots: 80,
    filledSlots: 12,
    status: "ACTIVE",
    startedAt: "2026-04-22T12:00:00.000Z",
    endedAt: null,
  },
  {
    id: "season-older",
    teamId: "team-1",
    monthKey: "2026-03",
    goalName: "三月冲刺",
    targetSlots: 50,
    filledSlots: 50,
    status: "ENDED",
    startedAt: "2026-03-01T00:00:00.000Z",
    endedAt: "2026-03-31T00:00:00.000Z",
  },
];

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("SeasonAdminPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ seasons: initialSeasons })),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the create form, active season, and history", async () => {
    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={initialSeasons} />);
    });

    expect(container.textContent).toContain("赛季设置");
    expect(container.textContent).toContain("回到打卡页");
    expect(container.textContent).toContain("冲刺目标");
    expect(container.textContent).toContain("目标格数");
    expect(container.textContent).toContain("五月掉脂挑战");
    expect(container.textContent).toContain("三月冲刺");
    expect(container.textContent).toContain("结束当前赛季");
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
    expect(container.querySelector('select[name="targetSlots"]')).not.toBeNull();
  });

  it("submits a new season with goalName and targetSlots", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: initialSeasons }));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          season: {
            id: "season-new",
            teamId: "team-1",
            monthKey: "2026-04",
            goalName: "六月掉脂挑战",
            targetSlots: 100,
            filledSlots: 0,
            status: "ACTIVE",
            startedAt: "2026-04-22T13:00:00.000Z",
            endedAt: null,
          },
        },
        201,
      ),
    );

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={initialSeasons} />);
    });

    const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
    const targetSelect = container.querySelector<HTMLSelectElement>('select[name="targetSlots"]');
    const form = container.querySelector("form");

    expect(goalInput).not.toBeNull();
    expect(targetSelect).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      const setSelectValue = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;

      setInputValue?.call(goalInput, "六月掉脂挑战");
      goalInput!.dispatchEvent(new Event("input", { bubbles: true }));
      setSelectValue?.call(targetSelect, "100");
      targetSelect!.dispatchEvent(new Event("change", { bubbles: true }));
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/seasons",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ goalName: "六月掉脂挑战", targetSlots: 100 }),
      }),
    );
  });

  it("ends the active season through the current season endpoint", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: initialSeasons }));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        season: {
          ...initialSeasons[0],
          status: "ENDED",
          endedAt: "2026-04-22T14:00:00.000Z",
        },
      }),
    );

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={initialSeasons} />);
    });

    const endButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("结束当前赛季"),
    );

    expect(endButton).not.toBeUndefined();

    await act(async () => {
      endButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/seasons/current", {
      method: "PATCH",
    });
  });
});
