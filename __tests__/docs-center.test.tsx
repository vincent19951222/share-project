import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocsCenter } from "@/components/docs-center/DocsCenter";
import { DocsTableOfContents } from "@/components/docs-center/DocsTableOfContents";

const replaceMock = vi.fn();
let pathnameMock: string | null = "/docs";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("DocsCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pathnameMock = "/docs";
    replaceMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the rules tab with a deep-linkable table of contents and query navigation", async () => {
    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    expect(container.textContent).toContain("文档中心");
    expect(container.textContent).toContain("最近更新");
    expect(container.textContent).toContain("赛季规则");
    expect(container.textContent).not.toContain("EDITORIAL MANUAL");
    expect(container.textContent).not.toContain("SECTION");
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(container.querySelector('a[href="/docs?tab=rules#vault"]')).not.toBeNull();
    expect(container.textContent).toContain("牛马金库");
    expect(container.textContent).not.toContain("为什么文档中心放在下拉里？");

    const faqButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("常见问题"),
    );
    const rulesButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("赛季规则"),
    );

    expect(faqButton).toBeDefined();
    expect(rulesButton).toBeDefined();
    expect(rulesButton?.getAttribute("aria-pressed")).toBe("true");
    expect(faqButton?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      faqButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("为什么文档中心放在下拉里？");
    expect(container.textContent).not.toContain("赛季开始 / 结束逻辑");
    expect(container.querySelector('a[href="/docs?tab=faq#docs-dropdown"]')).not.toBeNull();
    expect(container.querySelector('a[href="/docs?tab=rules#vault"]')).toBeNull();
    expect(rulesButton?.getAttribute("aria-pressed")).toBe("false");
    expect(faqButton?.getAttribute("aria-pressed")).toBe("true");
    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=faq", { scroll: false });
  });

  it("renders table-of-contents links from a caller-provided href base", async () => {
    await act(async () => {
      root.render(
        <DocsTableOfContents
          hrefBase="/manual?tab=help"
          items={[
            { id: "punch-workflow", label: "怎么完成健身打卡" },
            { id: "asset-check", label: "怎么查看个人资产和赛季状态" },
          ]}
        />,
      );
    });

    expect(container.querySelector('a[href="/manual?tab=help#punch-workflow"]')).not.toBeNull();
    expect(container.querySelector('a[href="/manual?tab=help#asset-check"]')).not.toBeNull();
  });

  it("shows gamification rules inside the docs center", async () => {
    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    expect(container.textContent).toContain("补给站玩法规则");
    expect(container.textContent).toContain("每天最多两张免费券");
    expect(container.textContent).toContain("十连消耗 10 张券");
    expect(container.querySelector("#supply-station-rules")).not.toBeNull();
  });

  it("falls back to /docs when pathname is unavailable", async () => {
    pathnameMock = null;

    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    expect(container.querySelector('a[href="/docs?tab=rules#vault"]')).not.toBeNull();

    const faqButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("常见问题"),
    );

    expect(faqButton).toBeDefined();

    await act(async () => {
      faqButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=faq", { scroll: false });
  });
});
