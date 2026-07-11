import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FitnessPunchTicketPrototypePage from "@/app/ui-prototypes/fitness-punch-ticket/page";

vi.mock("@/app/ui-prototypes/fitness-punch-ticket/FitnessPunchTicketPrototype.module.css", () => ({
  default: new Proxy({}, { get: (_target, key) => String(key) }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("FitnessPunchTicketPrototypePage", () => {
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

  it("renders the static fitness punch ticket structure", () => {
    act(() => {
      root.render(<FitnessPunchTicketPrototypePage />);
    });

    expect(container.textContent).toContain("今日训练小票");
    expect(container.textContent).toContain("A");
    expect(container.textContent).toContain("有氧项目");
    expect(container.textContent).toContain("散步");
    expect(container.textContent).toContain("跳舞");
    expect(container.textContent).toContain("动感单车");
    expect(container.textContent).toContain("B");
    expect(container.textContent).toContain("今日重点部位");
    expect(container.textContent).toContain("胸部");
    expect(container.textContent).toContain("手臂");
    expect(container.textContent).toContain("臀腿");
    expect(container.textContent).not.toContain("臀部");
    expect(container.textContent).toContain("C");
    expect(container.textContent).toContain("训练时长");
    expect(container.textContent).toContain("有氧：跑步机");
    expect(container.textContent).toContain("部位：未选择");
    expect(container.textContent).toContain("60");
    expect(container.textContent).toContain("确认打卡");
    expect(container.textContent).not.toContain("取消全员打卡");

    expect(container.querySelectorAll("img[data-strength-part-icon]")).toHaveLength(6);
    expect(container.querySelectorAll("svg[data-strength-part-icon]")).toHaveLength(0);
    expect(container.querySelector('img[alt="今日训练部位肌肉图"]')).toBeNull();
  });
});
