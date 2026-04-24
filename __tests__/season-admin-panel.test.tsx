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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
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
    expect(container.textContent).toContain("当前正在冲刺");
    expect(container.textContent).toContain("完成率 15%");
    expect(container.textContent).toContain("还差 68 格");
    expect(container.textContent).toContain("开始于 2026/04/22");
    expect(container.textContent).toContain("已有进行中的赛季，先结束当前赛季再开启新赛季");
    expect(container.textContent).toContain("已结束");
    expect(container.textContent).toContain("开始于 2026/03/01");
    expect(container.textContent).toContain("结束于 2026/03/31");
    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("已有赛季进行中"),
    );
    expect(submitButton).not.toBeUndefined();
    expect(submitButton).toHaveProperty("disabled", true);
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
    expect(container.querySelector('select[name="targetSlots"]')).not.toBeNull();
  });

  it("shows a create-ready empty state when there is no active season", async () => {
    const endedOnly: SeasonListItem[] = [
      {
        id: "season-ended",
        teamId: "team-1",
        monthKey: "2026-04",
        goalName: "四月冲刺",
        targetSlots: 80,
        filledSlots: 72,
        status: "ENDED",
        startedAt: "2026-04-01T00:00:00.000Z",
        endedAt: "2026-04-20T00:00:00.000Z",
      },
    ];
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: endedOnly }));

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={endedOnly} />);
    });

    expect(container.textContent).toContain("现在没有进行中的赛季");
    expect(container.textContent).toContain("可以直接开启下一期团队冲刺");
    expect(container.textContent).toContain("完成率 90%");
  });

  it("submits a new season with goalName and targetSlots", async () => {
    const endedOnly: SeasonListItem[] = [
      {
        id: "season-ended",
        teamId: "team-1",
        monthKey: "2026-04",
        goalName: "四月冲刺",
        targetSlots: 80,
        filledSlots: 72,
        status: "ENDED",
        startedAt: "2026-04-01T00:00:00.000Z",
        endedAt: "2026-04-20T00:00:00.000Z",
      },
    ];
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: endedOnly }));
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
      root.render(<SeasonAdminPanel initialSeasons={endedOnly} />);
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

  it("does not create a season when one is already active", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: initialSeasons }));

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={initialSeasons} />);
    });

    const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
    const targetSelect = container.querySelector<HTMLSelectElement>('select[name="targetSlots"]');
    const form = container.querySelector("form");
    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("已有赛季进行中"),
    );

    expect(goalInput?.disabled).toBe(true);
    expect(targetSelect?.disabled).toBe(true);
    expect(submitButton?.disabled).toBe(true);
    expect(form).not.toBeNull();

    await act(async () => {
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/seasons",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("clamps progress details for invalid season counts", async () => {
    const endedOnly: SeasonListItem[] = [
      {
        id: "season-ended",
        teamId: "team-1",
        monthKey: "2026-04",
        goalName: "异常冲刺",
        targetSlots: -5,
        filledSlots: 12,
        status: "ENDED",
        startedAt: "2026-04-01T00:00:00.000Z",
        endedAt: "2026-04-20T00:00:00.000Z",
      },
    ];
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: endedOnly }));

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={endedOnly} />);
    });

    expect(container.textContent).toContain("进度 0/0");
    expect(container.textContent).toContain("完成率 0%");
    expect(container.textContent).not.toContain("还差 -");
  });

  it("ends the active season through the current season endpoint", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const deferredResponse = createDeferred<Response>();
    fetchMock.mockReturnValueOnce(Promise.resolve(createJsonResponse({ seasons: initialSeasons })));
    fetchMock.mockReturnValueOnce(deferredResponse.promise);

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={initialSeasons} />);
    });

    const endButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("结束当前赛季"),
    );
    const createButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("已有赛季进行中"),
    );

    expect(endButton).not.toBeUndefined();
    expect(createButton).not.toBeUndefined();

    await act(async () => {
      endButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(endButton?.textContent).toContain("正在结束...");
    expect(createButton?.textContent).toContain("已有赛季进行中");
    expect(container.textContent).not.toContain("正在开赛季...");

    await act(async () => {
      deferredResponse.resolve(
        createJsonResponse({
          season: {
            ...initialSeasons[0],
            status: "ENDED",
            endedAt: "2026-04-22T14:00:00.000Z",
          },
        }),
      );
      await deferredResponse.promise;
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/seasons/current", {
      method: "PATCH",
    });
  });

  it("shows a friendly admin-only message when create season is forbidden", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: [] }));
    fetchMock.mockResolvedValueOnce(createJsonResponse({ error: "Forbidden" }, 403));

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={[]} />);
    });

    const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
    const form = container.querySelector("form");

    expect(goalInput).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      setInputValue?.call(goalInput, "六月掉脂挑战");
      goalInput!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain("只有管理员可以管理赛季");
  });

  it("shows the server conflict message when there is already an active season", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: [] }));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        { error: "当前已经有进行中的赛季了", code: "SEASON_CONFLICT" },
        409,
      ),
    );

    await act(async () => {
      root.render(<SeasonAdminPanel initialSeasons={[]} />);
    });

    const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
    const form = container.querySelector("form");

    expect(goalInput).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      setInputValue?.call(goalInput, "六月掉脂挑战");
      goalInput!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain("当前已经有进行中的赛季了");
  });

  it("shows a friendly message and hides raw English text when ending a missing active season", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: initialSeasons }));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: "Season not found", code: "SEASON_NOT_FOUND" }, 404),
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

    expect(container.textContent).toContain("当前没有可结束的赛季");
    expect(container.textContent).not.toContain("Season not found");
  });

  it("preserves explicit Chinese backend text when ending a missing active season", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: initialSeasons }));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: "当前赛季已经结束了", code: "SEASON_NOT_FOUND" }, 404),
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

    expect(container.textContent).toContain("当前赛季已经结束了");
  });
});
