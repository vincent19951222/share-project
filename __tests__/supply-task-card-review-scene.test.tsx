import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskCardReviewScene } from "@/components/gamification/ui-lab/task-cards/TaskCardReviewScene";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("TaskCardReviewScene", () => {
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

  it("renders the contact sheet and both Dashboard placement previews", async () => {
    await act(async () => {
      root.render(<TaskCardReviewScene />);
    });

    expect(container.querySelector(".supply-task-card-review-scene")).not.toBeNull();
    expect(container.querySelector(".supply-task-card-review-grid")).not.toBeNull();
    expect(container.querySelectorAll(".supply-task-card-review-grid .supply-task-card")).toHaveLength(4);
    expect(container.querySelector(".supply-task-card-dashboard-preview--compact")).not.toBeNull();
    expect(container.querySelector(".supply-task-card-dashboard-preview--card-first")).not.toBeNull();
    expect(container.querySelectorAll(".supply-task-card-dashboard-preview .supply-task-card")).toHaveLength(8);
    expect(container.textContent).toContain("Compact 2x2");
    expect(container.textContent).toContain("Card-first 2x2");
  });
});
