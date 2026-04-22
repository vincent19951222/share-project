import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PunchPopup } from "@/components/ui/PunchPopup";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("PunchPopup", () => {
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

  it("shows a confirmation dialog instead of punch type options", () => {
    const onConfirm = vi.fn();

    act(() => {
      root.render(<PunchPopup onConfirm={onConfirm} />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");
    expect(trigger).toBeDefined();

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("确认打卡今天吗");
    expect(container.textContent).toContain("确认打卡");
    expect(container.textContent).not.toContain("力量");
    expect(container.textContent).not.toContain("有氧");
    expect(container.textContent).not.toContain("伸展");
  });

  it("keeps the dialog open and shows inline error when async confirm fails", async () => {
    const onConfirm = vi.fn().mockResolvedValue(false);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "+",
    );

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("确认打卡"),
    );

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("确认打卡今天吗？");

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          error="今天已经打过卡了"
        />,
      );
    });

    expect(container.textContent).toContain("今天已经打过卡了");
    expect(container.textContent).toContain("确认打卡今天吗？");
  });

  it("renders busy state after opening the popup", async () => {
    const onConfirm = vi.fn();

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "+",
    );

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} busy />);
    });

    const busyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("提交中..."),
    );

    expect(busyButton).toBeDefined();
    expect((busyButton as HTMLButtonElement).disabled).toBe(true);
  });
});
