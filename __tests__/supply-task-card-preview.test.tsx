import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCardPreview } from "@/components/gamification/ui-lab/task-cards/TaskCardPreview";
import { taskCardReviewCards } from "@/components/gamification/ui-lab/task-cards/task-card-demo-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("TaskCardPreview", () => {
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

  it("renders one 3:4 task card with dynamic text and art", async () => {
    await act(async () => {
      root.render(<TaskCardPreview card={taskCardReviewCards[0]} />);
    });

    const card = container.querySelector(".supply-task-card");
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-card-id")).toBe("movement_004");
    expect(card?.getAttribute("data-dimension")).toBe("movement");
    expect(card?.getAttribute("data-aspect-ratio")).toBe("3:4");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("窗边回血");
    expect(container.textContent).toContain("轻");
    expect(container.textContent).toContain("通用");
    expect(container.textContent).toContain("4天");
    expect(container.textContent).toContain("已完成");
    expect(container.querySelector(".supply-task-card-art img")?.getAttribute("src")).toBe(taskCardReviewCards[0].image);
  });

  it("keeps reroll as a React control instead of baked image text", async () => {
    const onReroll = vi.fn();

    await act(async () => {
      root.render(<TaskCardPreview card={taskCardReviewCards[3]} onReroll={onReroll} />);
    });

    const button = container.querySelector<HTMLButtonElement>(".supply-task-card-reroll");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("换一个");
    expect(container.querySelector(".supply-task-card-state")?.textContent).toBe("进行中");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onReroll).toHaveBeenCalledWith("learning_005");
  });
});
