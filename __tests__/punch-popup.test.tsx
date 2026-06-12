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

  function pageText() {
    return document.body.textContent ?? "";
  }

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

    expect(pageText()).toContain("确认打卡今天吗");
    expect(pageText()).toContain("确认打卡");
    expect(pageText()).not.toContain("力量");
    expect(pageText()).not.toContain("有氧");
    expect(pageText()).not.toContain("伸展");
  });

  it("can render the richer fitness ticket confirmation variant", () => {
    const onConfirm = vi.fn();

    act(() => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          helperText="确认后会记为今日健身打卡，并获得 1 张健身券。"
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");
    expect(trigger).toBeDefined();

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("今日训练小票");
    expect(pageText()).toContain("训练类型");
    expect(pageText()).toContain("有氧项目");
    expect(pageText()).toContain("力量部位");
    expect(pageText()).toContain("确认后会记为今日健身打卡，并获得 1 张健身券。");
    expect(document.body.querySelector('img[alt="今日训练部位肌肉图"]')).not.toBeNull();
  });

  it("forwards the selected workout payload from the fitness ticket variant", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const swimButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "游泳");
    const absButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "腹");
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    await act(async () => {
      swimButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      absButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "both",
      cardioItem: "swim",
      strengthParts: ["chest", "shoulder", "glutes", "abs"],
      durationMinutes: 60,
    });
  });

  it("blocks confirmation when both training has no strength part selected", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const chestButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "胸");
    const shoulderButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "肩");
    const glutesButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "臀");

    await act(async () => {
      chestButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      shoulderButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      glutesButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    expect(confirmButton).toBeDefined();
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    expect(pageText()).toContain("至少选择一个力量部位");

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("mounts the fitness ticket modal at document body level", () => {
    const onConfirm = vi.fn();

    act(() => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    act(() => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector(".fitness-ticket-modal-layer")?.parentElement).toBe(document.body);
  });

  it("prefills the fitness ticket from an existing workout payload", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          confirmLabel="保存修改"
          initialWorkoutPayload={{
            trainingType: "strength",
            cardioItem: null,
            strengthParts: ["back", "abs"],
            durationMinutes: 50,
          }}
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("背 / 腹");
    expect(pageText()).toContain("50");

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("保存修改"));

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["back", "abs"],
      durationMinutes: 50,
    });
  });

  it("runs the fitness ticket danger action and closes on success", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onDangerAction = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          onDangerAction={onDangerAction}
          dangerLabel="撤销打卡"
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dangerButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("撤销打卡"));

    await act(async () => {
      dangerButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onDangerAction).toHaveBeenCalledTimes(1);
    expect(pageText()).not.toContain("今日训练小票");
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

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("确认打卡"),
    );

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(pageText()).toContain("确认打卡今天吗？");

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          error="今天已经打过卡了"
        />,
      );
    });

    expect(pageText()).toContain("今天已经打过卡了");
    expect(pageText()).toContain("确认打卡今天吗？");
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

    const busyButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("提交中..."),
    );

    expect(busyButton).toBeDefined();
    expect((busyButton as HTMLButtonElement).disabled).toBe(true);
  });
});
