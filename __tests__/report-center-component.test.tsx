import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportHeader } from "@/components/report-center/ReportHeader";
import { Milestones } from "@/components/report-center/Milestones";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { REPORT_METRIC_IDS, type ReportData } from "@/components/report-center/report-data";
import { DrinkProvider } from "@/lib/drink-store";
import { BoardProvider } from "@/lib/store";
import type { BoardState, DrinkSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    { id: "u1", name: "li", avatarKey: "male1", assetBalance: 120, seasonIncome: 30, slotContribution: 2 },
    { id: "u2", name: "luo", avatarKey: "male2", assetBalance: 80, seasonIncome: 20, slotContribution: 1 },
  ],
  gridData: [
    [true, true, false],
    [true, false, true],
  ],
  teamVaultTotal: 1450,
  currentUser: {
    assetBalance: 120,
    currentStreak: 6,
    nextReward: 20,
    seasonIncome: 30,
    isAdmin: false,
  },
  activeSeason: {
    id: "season-1",
    monthKey: "2026-04",
    goalName: "减脂挑战",
    targetSlots: 5,
    filledSlots: 3,
    contributions: [
      { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 30 },
      { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 20 },
    ],
  },
  today: 3,
  totalDays: 3,
  logs: [],
  activeTab: "dash",
  currentUserId: "u1",
};

const emptyDrinkCounts = {
  water: 0,
  milkTea: 0,
  americano: 0,
  latte: 0,
  other: 0,
} as const;

function drinkSnapshot(): DrinkSnapshot {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1" },
      { id: "u2", name: "luo", avatarKey: "male2" },
    ],
    gridData: [
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 1, 2][index] ?? 0,
        drinkCounts: emptyDrinkCounts,
      })),
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 3, 1][index] ?? 0,
        drinkCounts: emptyDrinkCounts,
      })),
    ],
    today: 24,
    totalDays: 30,
    currentUserId: "u1",
    todayEvents: [],
    stats: {
      todayTotalCups: 3,
      todayDrinkers: 2,
      currentUserTodayCups: 2,
      drinkKing: { userId: "u1", name: "li", cups: 2 },
      favoriteDrink: { drinkType: "americano", count: 2 },
      latestDrink: null,
      drinkCounts: { ...emptyDrinkCounts, americano: 2 },
    },
  };
}

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

async function waitFor(assertion: () => void | Promise<void>, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await assertion();
      return;
    } catch (error) {
      await act(async () => {
        await Promise.resolve();
      });
      if (attempt === attempts - 1) {
        throw error;
      }
    }
  }
}

function buildAdminState(): BoardState {
  return {
    ...initialState,
    currentUser: {
      ...initialState.currentUser!,
      isAdmin: true,
    },
  };
}

async function renderReportCenter(root: Root, state: BoardState) {
  await act(async () => {
      root.render(
        <BoardProvider initialState={state}>
        <DrinkProvider>
          <ReportCenter />
        </DrinkProvider>
      </BoardProvider>,
    );
  });
}

function findButton(container: HTMLDivElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  );
}

function relabeledMetrics(): ReportData["metrics"] {
  return [
    {
      id: REPORT_METRIC_IDS.completionRate,
      label: "完成率改名测试",
      value: "66%",
      helper: "仍然应该挂到报头 KPI 里。",
      tone: "good",
    },
    {
      id: REPORT_METRIC_IDS.totalPunches,
      label: "打卡次数改名测试",
      value: "42",
      helper: "仍然应该挂到报头 KPI 里。",
      tone: "plain",
    },
    {
      id: REPORT_METRIC_IDS.perfectDays,
      label: "全勤改名测试",
      value: "3",
      helper: "仍然应该挂到黄卡里。",
      tone: "good",
    },
    {
      id: REPORT_METRIC_IDS.monthlyHighlight,
      label: "高光改名测试",
      value: "最稳：li",
      helper: "仍然应该挂到红卡里。",
      tone: "warm",
    },
  ];
}

describe("ReportCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, "", "/report");
    vi.setSystemTime(new Date("2026-04-24T12:00:00+08:00"));
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === "/api/drinks/state") {
          return Promise.resolve(createJsonResponse({ snapshot: drinkSnapshot() }));
        }
        throw new Error(`Unexpected fetch call: ${String(input)}`);
      }),
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
    vi.useRealTimers();
  });

  it("renders the lightweight dashboard with a playful drink report", async () => {
    await renderReportCenter(root, initialState);

    await waitFor(() => {
      expect(container.textContent).toContain("4月牛马战报");
      expect(container.textContent).toContain("本月打卡 4 次，全勤 1 天，团队节奏还有上升空间。");
      expect(container.textContent).toContain("团队完成率");
      expect(container.textContent).toContain("总打卡次数");
      expect(container.textContent).toContain("牛马金库");
      expect(container.textContent).toContain("减脂挑战 · 3/5");
      expect(container.textContent).toContain("活跃趋势");
      expect(container.textContent).toContain("牛马水铺");
      expect(container.textContent).toContain("Daily Sip");
      expect(container.textContent).toContain("今日全队 3 杯");
      expect(container.textContent).toContain("饮品人数");
      expect(container.textContent).toContain("2/2");
      expect(container.textContent).toContain("本月累计");
      expect(container.textContent).toContain("13 杯");
      expect(container.textContent).toContain("今日状态");
      expect(container.textContent).toContain("Relax");
      expect(container.textContent).toContain("本周饮品王");
      expect(container.textContent).toContain("luo · 7 杯");
      expect(container.querySelector(".report-scene")).not.toBeNull();
      expect(container.querySelector(".report-scene-content")).not.toBeNull();
      expect(container.querySelector(".report-header-strip")).not.toBeNull();
      expect(container.querySelector(".report-scene-analysis")).not.toBeNull();
      expect(container.querySelector(".report-analysis-paper")).not.toBeNull();
      expect(container.querySelector(".report-analysis-editorial-frame")).not.toBeNull();
      expect(container.querySelector(".report-analysis-title")).not.toBeNull();
      expect(container.querySelector(".report-analysis-badge")).not.toBeNull();
      expect(container.querySelector(".report-analysis-chips")).not.toBeNull();
      expect(container.querySelector(".report-analysis-today-strip")).toBeNull();
      expect(container.querySelector(".report-prototype-today-marker")).not.toBeNull();
      expect(container.querySelector(".report-prototype-today-label")).not.toBeNull();
      expect(container.querySelector(".report-analysis-ruler")).not.toBeNull();
      expect(container.querySelector(".coffee-report-inset-shell")).not.toBeNull();
      expect(container.querySelector(".coffee-report-appendix-head")).not.toBeNull();
      expect(container.querySelector(".report-header-pill[data-metric-id='completion-rate']")).not.toBeNull();
      expect(container.querySelector(".report-header-pill[data-metric-id='total-punches']")).not.toBeNull();
      expect(container.querySelector(".report-milestones")).not.toBeNull();
      expect(container.querySelector(".report-metric-tile[data-metric-id='completion-rate']")).not.toBeNull();
      expect(container.querySelector(".report-metric-tile[data-metric-id='total-punches']")).not.toBeNull();
      expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_cup_label.png']")).not.toBeNull();
      expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_receipt.png']")).not.toBeNull();
      expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_keep_going_stamp.webp']")).not.toBeNull();
      expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_mini_chart_slip.webp']")).not.toBeNull();
      expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_vault_safe_yellow.webp']")).not.toBeNull();
      expect(container.querySelector("svg[aria-label='团队每日打卡人数趋势']")).not.toBeNull();
      expect(container.querySelector(".report-scene-bottom")).toBeNull();
      expect(container.querySelector(".report-scene-admin")).toBeNull();
    });

    expect(container.textContent).not.toContain("牛马补给周报");
    expect(container.textContent).not.toContain("本周高光");
    expect(container.textContent).not.toContain("本周周报");
    expect(container.textContent).not.toContain("气氛组播报");
    expect(container.textContent).not.toContain("OCTOBER REPORT");
    expect(container.textContent).not.toContain("+12,450");
    expect(container.textContent).not.toContain("Bob");
    expect(container.textContent).not.toContain("10.01");
  });

  it("does not render removed weekly report workflows for admins", async () => {
    await renderReportCenter(root, buildAdminState());

    await waitFor(() => {
      expect(container.textContent).toContain("4月牛马战报");
      expect(container.textContent).not.toContain("牛马补给周报");
      expect(container.textContent).not.toContain("本周周报");
      expect(findButton(container, "生成本周周报")).toBeUndefined();
      expect(findButton(container, "发布到团队动态")).toBeUndefined();
      expect(container.querySelector(".report-scene-bottom")).toBeNull();
      expect(container.querySelector(".report-scene-admin")).toBeNull();
    });
  });

  it("keeps header pills and milestone tiles bound to stable metric ids instead of display labels", async () => {
    act(() => {
      root.render(
        <div>
          <ReportHeader
            title="4月牛马战报"
            summary="这里是摘要。"
            teamVault={{ current: 1450, helper: "减脂挑战 · 3/5" }}
            metrics={relabeledMetrics()}
          />
          <Milestones metrics={relabeledMetrics()} />
        </div>,
      );
    });

    const completionPill = container.querySelector(
      ".report-header-pill[data-metric-id='completion-rate']",
    );
    const totalPunchesPill = container.querySelector(
      ".report-header-pill[data-metric-id='total-punches']",
    );
    const perfectDaysTile = container.querySelector(
      ".report-metric-tile[data-metric-id='perfect-days']",
    );
    const monthlyHighlightTile = container.querySelector(
      ".report-metric-tile[data-metric-id='monthly-highlight']",
    );
    const completionAccent = container.querySelector(
      ".report-metric-tile[data-metric-id='completion-rate'] .report-metric-accent",
    );
    const totalPunchesAccent = container.querySelector(
      ".report-metric-tile[data-metric-id='total-punches'] .report-metric-accent",
    );
    const perfectDaysAccent = container.querySelector(
      ".report-metric-tile[data-metric-id='perfect-days'] .report-metric-accent",
    );
    const monthlyHighlightAccent = container.querySelector(
      ".report-metric-tile[data-metric-id='monthly-highlight'] .report-metric-accent",
    );

    expect(completionPill?.textContent).toContain("完成率改名测试");
    expect(totalPunchesPill?.textContent).toContain("打卡次数改名测试");
    expect(perfectDaysTile?.textContent).toContain("全勤改名测试");
    expect(monthlyHighlightTile?.textContent).toContain("高光改名测试");
    expect(completionAccent?.className).toContain("bg-emerald-300");
    expect(totalPunchesAccent?.className).toContain("bg-sky-300");
    expect(perfectDaysAccent?.className).toContain("bg-amber-300");
    expect(monthlyHighlightAccent?.className).toContain("bg-rose-300");
  });

  it("keeps decorative report icons hidden from assistive tech", async () => {
    act(() => {
      root.render(
        <div>
          <ReportHeader
            title="4月牛马战报"
            summary="这里是摘要。"
            teamVault={{ current: 1450, helper: "减脂挑战 · 3/5" }}
            metrics={relabeledMetrics()}
          />
          <Milestones metrics={relabeledMetrics()} />
        </div>,
      );
    });

    expect(container.querySelector(".report-header-copy span[aria-hidden='true']")).not.toBeNull();

    const milestoneIcons = Array.from(container.querySelectorAll(".report-metric-icon"));

    expect(milestoneIcons).toHaveLength(4);
    for (const icon of milestoneIcons) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
