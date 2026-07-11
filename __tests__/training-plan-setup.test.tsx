import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingPlanSetupDialog } from "@/components/training-plan/TrainingPlanSetupDialog";
import { ApiError, createTrainingPlan } from "@/lib/api";
import type { BoardSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createTrainingPlan: vi.fn() };
});

const snapshot = {
  members: [],
  gridData: [],
  today: 1,
  totalDays: 31,
  currentUserId: "user-1",
  currentTrainingPlan: null,
} satisfies BoardSnapshot;

describe("TrainingPlanSetupDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.mocked(createTrainingPlan).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(onCreated = vi.fn()) {
    act(() => {
      root.render(
        <TrainingPlanSetupDialog open onClose={vi.fn()} onCreated={onCreated} />,
      );
    });
    return onCreated;
  }

  function button(label: string) {
    return Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it("defaults to three days, 45 minutes and Monday Wednesday Saturday", () => {
    render();
    expect(button("3 天").getAttribute("aria-pressed")).toBe("true");
    expect(button("45 分钟").getAttribute("aria-pressed")).toBe("true");
    expect(button("周一").getAttribute("aria-pressed")).toBe("true");
    expect(button("周三").getAttribute("aria-pressed")).toBe("true");
    expect(button("周六").getAttribute("aria-pressed")).toBe("true");
  });

  it("requires the selected weekday count to match the frequency", async () => {
    render();
    await act(async () => {
      button("周六").click();
    });
    await act(async () => {
      button("生成计划").click();
    });
    expect(document.body.textContent).toContain("请选择 3 个训练日");
    expect(createTrainingPlan).not.toHaveBeenCalled();
  });

  it("submits the supported fixed options and applies the returned snapshot", async () => {
    vi.mocked(createTrainingPlan).mockResolvedValue(snapshot);
    const onCreated = render();

    await act(async () => {
      button("生成计划").click();
      await Promise.resolve();
    });

    expect(createTrainingPlan).toHaveBeenCalledWith({
      weeklyFrequency: 3,
      sessionDurationMinutes: 45,
      weekdays: [1, 3, 6],
      equipment: ["gym"],
      avoidTags: [],
    });
    expect(onCreated).toHaveBeenCalledWith(snapshot);
  });

  it("shows a friendly conflict when an active plan already exists", async () => {
    vi.mocked(createTrainingPlan).mockRejectedValue(
      new ApiError("active-plan-exists", 409),
    );
    render();

    await act(async () => {
      button("生成计划").click();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("已有进行中的计划");
  });
});
