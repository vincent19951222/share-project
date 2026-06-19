import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { DrinkProvider } from "@/lib/drink-store";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    isAdmin: true,
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

function jsonResponse(body: unknown) {
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

const emptyDrinkCounts = {
  water: 0,
  milkTea: 0,
  americano: 0,
  latte: 0,
  other: 0,
} as const;

function drinkSnapshot() {
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

function weeklySnapshot() {
  return {
    teamId: "team_1",
    weekStartDayKey: "2026-04-20",
    weekEndDayKey: "2026-04-26",
    generatedAt: "2026-04-26T02:00:00.000Z",
    published: true,
    publishedDynamicId: "dynamic_1",
    metrics: {},
    metricCards: [
      { key: "task-rate", label: "四维完成率", value: "50%", helper: "28/56 个任务完成", tone: "default" },
      { key: "tickets-earned", label: "本周发券", value: "10", helper: "健身 5 · 四维 4 · 补券 1", tone: "highlight" },
      { key: "draws", label: "抽奖次数", value: "3", helper: "单抽 2 · 十连 1", tone: "success" },
      { key: "social-response", label: "弱社交响应", value: "100%", helper: "2/2 个邀请有回应", tone: "success" },
    ],
    summaryCards: [{ key: "rhythm", title: "补给站节奏", body: "本周四维任务完成率 50%。", tone: "default" }],
    highlights: [
      {
        id: "dynamic_1",
        title: "全员在周二达成最高打卡率 87%！",
        summary: "这条高光会挂到右侧便签墙。",
        sourceType: "team_dynamic",
        sourceId: "dynamic_1",
        occurredAt: "2026-04-23T04:00:00.000Z",
      },
    ],
  };
}

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    if (String(input) === "/api/drinks/state") {
      return Promise.resolve(jsonResponse({ snapshot: drinkSnapshot() }));
    }
    if (String(input) === "/api/gamification/reports/weekly") {
      return Promise.resolve(jsonResponse({ snapshot: weeklySnapshot() }));
    }
    if (String(input) === "/api/reports/weekly/draft") {
      return Promise.resolve(jsonResponse({ draft: null }));
    }
    if (String(input) === "/api/reports/weekly/publish") {
      return Promise.resolve(jsonResponse({ dynamic: { id: "weekly-dynamic-1" } }));
    }
    throw new Error(`Unexpected fetch call: ${String(input)}`);
  });
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

describe("home report scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00+08:00"));
    vi.stubGlobal("fetch", createFetchMock());
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

  it("renders the layered report editor scene with report-bound props", async () => {
    await renderReportCenter(root, initialState);

    await waitFor(() => {
      expect(container.querySelector(".report-scene")).not.toBeNull();
      expect(container.querySelector(".report-scene-background")).not.toBeNull();
      expect(container.querySelector(".report-scene-props")).not.toBeNull();
      expect(container.querySelector(".report-scene-content")).not.toBeNull();
      expect(container.querySelector(".report-header-strip")).not.toBeNull();
      expect(container.querySelector(".report-header-copy")).not.toBeNull();
      expect(container.querySelector(".report-header-vault")).not.toBeNull();
      expect(container.querySelector(".report-scene-analysis")).not.toBeNull();
      expect(container.querySelector(".report-scene-bottom")).toBeNull();
      expect(container.querySelector(".report-scene-admin")).toBeNull();
      expect(container.querySelector(".report-milestones")).not.toBeNull();
      expect(container.textContent).toContain("4月牛马战报");
      expect(container.textContent).not.toContain("本周高光");
      expect(container.textContent).not.toContain("本周周报");
    });

    const propSources = Array.from(container.querySelectorAll(".report-scene-props img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(propSources).toEqual(
      expect.arrayContaining([
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_binder_clip_left.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_discipline_note.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_no_excuses_note.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_bar_chart_note.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_stronger_stamp.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_focus_marker.webp",
      ]),
    );

    const headerAssetSources = Array.from(container.querySelectorAll(".report-header-strip img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(headerAssetSources).toEqual(
      expect.arrayContaining([
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_keep_going_stamp.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_mini_chart_slip.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_vault_safe_yellow.webp",
      ]),
    );

    const milestoneTiles = Array.from(container.querySelectorAll(".report-metric-tile"));

    expect(milestoneTiles).toHaveLength(4);
    expect(container.querySelectorAll(".report-scene-metrics > .report-metric-tile")).toHaveLength(4);
    expect(container.querySelector(".report-metric-tile[data-metric-id='completion-rate']")).not.toBeNull();
    expect(container.querySelector(".report-metric-tile[data-metric-id='total-punches']")).not.toBeNull();
    expect(container.querySelector(".report-metric-tile[data-metric-id='perfect-days']")).not.toBeNull();
    expect(container.querySelector(".report-metric-tile[data-metric-id='monthly-highlight']")).not.toBeNull();

    for (const tile of milestoneTiles) {
      expect(tile.querySelector(".report-metric-accent")).not.toBeNull();
      expect(tile.querySelector(".report-metric-icon")).not.toBeNull();
      expect(tile.querySelector(".report-metric-body")).not.toBeNull();
    }
  });
});
