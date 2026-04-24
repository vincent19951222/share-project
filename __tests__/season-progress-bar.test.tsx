import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SeasonProgressBar } from "@/components/punch-board/SeasonProgressBar";
import type { ActiveSeasonSnapshot } from "@/lib/types";

describe("SeasonProgressBar", () => {
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

  it("renders the expected grid template, slots, and contributor hover cards", () => {
    const activeSeason: ActiveSeasonSnapshot = {
      id: "season-1",
      monthKey: "2026-04",
      goalName: "减脂挑战",
      targetSlots: 5,
      filledSlots: 3,
      contributions: [
        {
          userId: "u1",
          name: "li",
          avatarKey: "male1",
          colorIndex: 0,
          slotContribution: 2,
          seasonIncome: 30,
        },
        {
          userId: "u2",
          name: "luo",
          avatarKey: "male2",
          colorIndex: 1,
          slotContribution: 1,
          seasonIncome: 20,
        },
        {
          userId: "u3",
          name: "liu",
          avatarKey: "female1",
          colorIndex: 2,
          slotContribution: 0,
          seasonIncome: 10,
        },
      ],
    };

    act(() => {
      root.render(<SeasonProgressBar activeSeason={activeSeason} />);
    });

    const grid = container.querySelector<HTMLElement>("[data-testid='season-progress-grid']");
    const liAvatar = container.querySelector<HTMLImageElement>("img[alt='li 的头像']");

    expect(grid).not.toBeNull();
    expect(grid!.style.gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");
    expect(container.querySelectorAll("[data-slot-state='filled']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-slot-state='empty']")).toHaveLength(2);
    expect(container.textContent).toContain("减脂挑战");
    expect(container.textContent).toContain("3/5");
    expect(container.textContent).toContain("li");
    expect(container.textContent).toContain("贡献 2 格 · 赛季收入 30 银子");
    expect(container.textContent).toContain("luo");
    expect(container.textContent).toContain("贡献 1 格 · 赛季收入 20 银子");
    expect(
      container.querySelector("[aria-label='li · 贡献 2 格 · 赛季收入 30 银子']"),
    ).not.toBeNull();
    expect(liAvatar).not.toBeNull();
    expect(liAvatar?.getAttribute("src")).toBe("/avatars/male1.png");
  });

  it("shows a safe fallback when the season month is invalid", () => {
    act(() => {
      root.render(
        <SeasonProgressBar
          activeSeason={{
            id: "season-invalid",
            monthKey: "2026-13",
            goalName: "Bad month",
            targetSlots: 5,
            filledSlots: 1,
            contributions: [],
          }}
        />,
      );
    });

    expect(container.textContent).toContain("赛季信息暂不可用");
  });

  it("renders the empty state copy when there is no active season", () => {
    act(() => {
      root.render(<SeasonProgressBar activeSeason={null} />);
    });

    expect(container.textContent).toContain("暂无进行中的团队冲刺");
    expect(container.textContent).toContain("打卡仍会累计我的银子");
  });

  it("renders the completed season copy when the sprint is fully filled", () => {
    act(() => {
      root.render(
        <SeasonProgressBar
          activeSeason={{
            id: "season-complete",
            monthKey: "2026-04",
            goalName: "掉脂挑战",
            targetSlots: 2,
            filledSlots: 2,
            contributions: [
              {
                userId: "u1",
                name: "li",
                avatarKey: "male1",
                colorIndex: 0,
                slotContribution: 2,
                seasonIncome: 80,
              },
            ],
          }}
        />,
      );
    });

    expect(container.textContent).toContain("本期团队冲刺进度");
    expect(container.textContent).toContain("四月掉脂挑战 · 2/2");
    expect(container.textContent).toContain("已冲满");
    expect(container.textContent).toContain("继续打卡仍累计我的银子和赛季收入");
  });
});
