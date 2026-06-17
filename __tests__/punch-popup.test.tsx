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

  function findModalButton(label: string) {
    return Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  }

  function trainingTypeSummary() {
    return document.body.querySelector('[aria-label="训练类型摘要"]');
  }

  function expectTrainingTypeSummaryLabels(labels: string[]) {
    expect(
      Array.from(trainingTypeSummary()?.querySelectorAll("strong") ?? []).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(labels);
  }

  function expectModalButtonActive(label: string, active: boolean) {
    expect(findModalButton(label)?.classList.contains("fitness-ticket-option-active")).toBe(active);
  }

  function workoutSummaryText() {
    return document.body.querySelector(".fitness-ticket-workout-summary")?.textContent?.replace(/\s+/g, "");
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
    expect(pageText()).toContain("有氧项目");
    expect(pageText()).toContain("散步");
    expect(pageText()).not.toContain("单车");
    expect(pageText()).toContain("今日重点部位");
    expect(pageText()).toContain("胸部");
    expect(pageText()).toContain("手臂");
    expect(pageText()).toContain("腿部");
    expect(pageText()).not.toContain("臀部");
    expect(pageText()).toContain("训练时长");
    expect(pageText()).toContain("确认后会记为今日健身打卡，并获得 1 张健身券。");
    expect(pageText()).not.toContain("取消全员打卡");
    expect(document.body.querySelectorAll("[data-strength-part-icon]")).toHaveLength(6);
    expect(document.body.querySelector('img[alt="今日训练部位肌肉图"]')).toBeNull();
  });

  it("opens the fitness ticket with cardio and treadmill active by default", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(findModalButton("有氧")).toBeUndefined();
    expect(findModalButton("力量")).toBeUndefined();
    expect(findModalButton("都有")).toBeUndefined();
    expectTrainingTypeSummaryLabels(["有氧"]);
    expectModalButtonActive("跑步机", true);
    expectModalButtonActive("散步", false);
    expectModalButtonActive("胸部", false);
    expect(workoutSummaryText()).toContain("有氧：跑步机");
    expect(workoutSummaryText()).toContain("部位：未选择");
    expect(workoutSummaryText()).toContain("时长：60分钟");

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 60,
    });
  });

  it("forwards the selected walking cardio payload from the fitness ticket variant", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      findModalButton("散步")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(workoutSummaryText()).toContain("有氧：散步");

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "cardio",
      cardioItem: "walk",
      strengthParts: [],
      durationMinutes: 60,
    });
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
    const armsButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "手臂");
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    await act(async () => {
      swimButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      armsButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "both",
      cardioItem: "swim",
      strengthParts: ["arms"],
      durationMinutes: 60,
    });
  });

  it("syncs the training type from cardio and strength selections", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      findModalButton("腹部")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectTrainingTypeSummaryLabels(["有氧", "力量"]);
    expect(trainingTypeSummary()?.textContent).not.toContain("都有");

    await act(async () => {
      findModalButton("跑步机")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectTrainingTypeSummaryLabels(["力量"]);
    expectModalButtonActive("跑步机", false);

    await act(async () => {
      findModalButton("腹部")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectTrainingTypeSummaryLabels(["未选择"]);
  });

  it("updates the generated part cards and workout summary from selections", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelectorAll("[data-strength-part-icon]")).toHaveLength(6);
    expect(document.body.querySelector('img[alt="今日训练部位肌肉图"]')).toBeNull();
    expect(workoutSummaryText()).toContain("部位：未选择");

    await act(async () => {
      findModalButton("手臂")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      findModalButton("腿部")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectModalButtonActive("手臂", true);
    expectModalButtonActive("腿部", true);
    expect(workoutSummaryText()).toContain("部位：手臂、腿部");
    expectTrainingTypeSummaryLabels(["有氧", "力量"]);

    await act(async () => {
      findModalButton("跑步机")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(workoutSummaryText()).toContain("部位：手臂、腿部");
    expectTrainingTypeSummaryLabels(["力量"]);
    expect(document.body.querySelector("[data-muscle-part]")).toBeNull();
  });

  it("blocks confirmation when no cardio item or strength part is selected", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      findModalButton("跑步机")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));

    expect(confirmButton).toBeDefined();
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    expect(pageText()).toContain("至少选择一个有氧项目或力量部位");

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

    expect(pageText()).toContain("背部、腹部");
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

  it("uses the compact edit footer when the fitness ticket has a danger action", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onDangerAction = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          confirmLabel="保存修改"
          onDangerAction={onDangerAction}
          dangerLabel="撤销打卡"
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const footer = document.body.querySelector(".fitness-ticket-footer");

    expect(footer?.classList.contains("fitness-ticket-footer-editing")).toBe(true);
    expect(Array.from(footer?.querySelectorAll("button") ?? []).map((button) => button.textContent?.trim())).toEqual([
      "撤销打卡",
      "取消",
      "保存修改",
    ]);
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
