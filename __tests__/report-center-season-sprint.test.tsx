import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SeasonSprintPanel } from "@/components/report-center/SeasonSprintPanel";
import type { ActiveSeasonSnapshot } from "@/lib/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("SeasonSprintPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("renders off-season placeholder when no season", () => {
    act(() => {
      root.render(<SeasonSprintPanel season={null} />);
    });

    expect(container.textContent).toMatch(/休赛期/);
    // 仅有占位，不应渲染赛季冲刺标题或饼图
    expect(container.querySelectorAll("path[data-season-slice]").length).toBe(0);
  });

  it("renders progress bar and contribution pie", () => {
    const season: ActiveSeasonSnapshot = {
      id: "s1",
      monthKey: "2026-06",
      goalName: "六月冲刺",
      targetSlots: 10,
      filledSlots: 4,
      contributions: [
        { userId: "u1", name: "张三", avatarKey: "a", colorIndex: 0, slotContribution: 3, seasonIncome: 0 },
        { userId: "u2", name: "李四", avatarKey: "b", colorIndex: 1, slotContribution: 1, seasonIncome: 0 },
        { userId: "u3", name: "王五", avatarKey: "c", colorIndex: 2, slotContribution: 0, seasonIncome: 0 },
      ],
    };

    act(() => {
      root.render(<SeasonSprintPanel season={season} />);
    });

    const text = container.textContent ?? "";
    expect(text).toContain("六月冲刺");
    // 进度文案 "已 4 / 目标 10"
    expect(text).toMatch(/已 4 \/ 目标 10/);
    // 贡献饼图扇区 = 非0贡献成员 = 2（王五 0 不显示）
    const slices = container.querySelectorAll("path[data-season-slice]");
    expect(slices.length).toBe(2);
  });
});
