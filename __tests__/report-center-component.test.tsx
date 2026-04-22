import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    { id: "u1", name: "li", avatarKey: "male1" },
    { id: "u2", name: "luo", avatarKey: "male2" },
  ],
  gridData: [
    [true, true, false],
    [true, false, true],
  ],
  teamCoins: 1450,
  targetCoins: 2000,
  today: 3,
  totalDays: 3,
  logs: [],
  activeTab: "dash",
  currentUserId: "u1",
};

describe("ReportCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the lightweight dashboard from board state", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ReportCenter />
        </BoardProvider>,
      );
    });

    expect(container.textContent).toContain("DASHBOARD");
    expect(container.textContent).toContain("本月打卡 4 次，全勤 1 天，团队节奏还有上升空间。");
    expect(container.textContent).toContain("团队完成率");
    expect(container.textContent).toContain("总打卡次数");
    expect(container.textContent).toContain("牛马金库");
    expect(container.textContent).toContain("ACTIVITY TREND / 活跃趋势");
    expect(container.textContent).toContain("气氛组播报");
    expect(container.textContent).not.toContain("OCTOBER REPORT");
    expect(container.textContent).not.toContain("+12,450");
    expect(container.textContent).not.toContain("Bob");
    expect(container.textContent).not.toContain("10.01");
    expect(container.querySelector("svg[aria-label='团队每日打卡人数趋势']")).not.toBeNull();
  });
});
