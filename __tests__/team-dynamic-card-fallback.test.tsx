import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeamDynamicListItem } from "@/lib/team-dynamics";
import { TeamDynamicCard } from "@/components/team-dynamics/TeamDynamicCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createLegacyReportItem(): TeamDynamicListItem {
  return {
    id: "weekly-1",
    type: "WEEKLY_REPORT_CREATED",
    title: "本周战报已经生成",
    summary: "本周打卡 18 次，全勤 2 天",
    occurredAt: "2026-04-25T08:00:00.000Z",
    payload: {},
    isRead: false,
    importance: "normal",
  };
}

describe("TeamDynamicCard legacy dynamic fallback", () => {
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

  it("renders old weekly report dynamics with the generic card", async () => {
    await act(async () => {
      root.render(<TeamDynamicCard item={createLegacyReportItem()} mode="page" />);
    });

    expect(container.textContent).toContain("动态");
    expect(container.textContent).toContain("本周战报已经生成");
    expect(container.textContent).toContain("本周打卡 18 次，全勤 2 天");
    expect(container.textContent).not.toContain("04.21 - 04.25");
    expect(container.textContent).not.toContain("18 次打卡");
    expect(container.textContent).not.toContain("2 天全勤");
    expect(container.textContent).not.toContain("12/50");
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
