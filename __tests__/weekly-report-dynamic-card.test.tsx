import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeamDynamicListItem } from "@/lib/team-dynamics";
import { TeamDynamicCard } from "@/components/team-dynamics/TeamDynamicCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createWeeklyReportItem(): TeamDynamicListItem {
  return {
    id: "weekly-1",
    type: "WEEKLY_REPORT_CREATED",
    title: "本周战报已经生成",
    summary: "本周打卡 18 次，全勤 2 天",
    occurredAt: "2026-04-25T08:00:00.000Z",
    payload: {
      version: 1,
      weekStartDayKey: "2026-04-21",
      weekEndDayKey: "2026-04-25",
      generatedAt: "2026-04-25T08:00:00.000Z",
      generatedByUserId: "admin-1",
      summary: "本周打卡 18 次，全勤 2 天，赛季进度 12/50。",
      metrics: {
        totalPunches: 18,
        fullAttendanceDays: 2,
        peakDay: { dayKey: "2026-04-23", value: 5 },
        lowDay: { dayKey: "2026-04-24", value: 2 },
        seasonProgress: { filledSlots: 12, targetSlots: 50, status: "ACTIVE" },
      },
      highlights: {
        topMembers: [{ userId: "u1", label: "本周高光", value: "li · 5 次有效打卡" }],
      },
      sections: [],
    },
    isRead: false,
    importance: "normal",
  };
}

describe("TeamDynamicCard weekly report preview", () => {
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
  });

  it("renders a richer weekly report preview from the payload snapshot", async () => {
    await act(async () => {
      root.render(<TeamDynamicCard item={createWeeklyReportItem()} mode="page" />);
    });

    expect(container.textContent).toContain("04.21 - 04.25");
    expect(container.textContent).toContain("本周打卡 18 次，全勤 2 天，赛季进度 12/50。");
    expect(container.textContent).toContain("18 次打卡");
    expect(container.textContent).toContain("2 天全勤");
    expect(container.textContent).toContain("12/50");
  });

  it("keeps generic rendering for non-weekly dynamic types", async () => {
    await act(async () => {
      root.render(
        <TeamDynamicCard
          item={{
            id: "season-1",
            type: "SEASON_STARTED",
            title: "新赛季已经开启",
            summary: "五月脱脂挑战开始了",
            occurredAt: "2026-04-25T08:00:00.000Z",
            payload: { goalName: "五月脱脂挑战" },
            isRead: true,
            importance: "normal",
          }}
          mode="page"
        />,
      );
    });

    expect(container.textContent).toContain("新赛季已经开启");
    expect(container.textContent).toContain("五月脱脂挑战开始了");
    expect(container.textContent).not.toContain("次打卡");
    expect(container.textContent).not.toContain("天全勤");
  });
});
