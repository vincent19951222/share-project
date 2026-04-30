import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GamificationDocsSection } from "@/components/docs-center/GamificationDocsSection";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("GamificationDocsSection", () => {
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

  it("renders rules, help, faq, and changelog content", () => {
    act(() => {
      root.render(<GamificationDocsSection />);
    });

    expect(container.textContent).toContain("牛马补给站规则说明上线");
    expect(container.textContent).toContain("每天最多两张免费券");
    expect(container.textContent).toContain("十连消耗 10 张券");
    expect(container.textContent).toContain("价格是 40 银子 / 张");
    expect(container.textContent).toContain("健身请假券");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("弱社交");
  });

  it("renders stable anchors for docs deep links", () => {
    act(() => {
      root.render(<GamificationDocsSection />);
    });

    expect(container.querySelector("#supply-station-rules")).not.toBeNull();
    expect(container.querySelector("#supply-station-help")).not.toBeNull();
    expect(container.querySelector("#supply-station-faq")).not.toBeNull();
    expect(container.querySelector("#supply-station-changelog")).not.toBeNull();
  });
});
