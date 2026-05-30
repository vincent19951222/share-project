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

  it("renders the rules tab as split second-level pages with query navigation", async () => {
    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    expect(container.textContent).toContain("文档中心");
    expect(container.textContent).toContain("脱脂牛马官方手册");
    expect(container.textContent).toContain("最近更新");
    expect(container.textContent).toContain("赛季规则");
    expect(container.textContent).not.toContain("EDITORIAL MANUAL");
    expect(container.textContent).not.toContain("SECTION");
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(container.querySelector("aside.docs-center-sidebar")).not.toBeNull();
    expect(container.querySelector("main.docs-center-content")).not.toBeNull();
    expect(container.querySelector("aside.docs-center-toc-panel")).toBeNull();
    expect(container.querySelector(".docs-page-brief")).toBeNull();
    expect(container.querySelectorAll(".docs-nav-group")).toHaveLength(4);
    expect(container.querySelector('.docs-nav-primary[aria-expanded="true"]')?.textContent).toContain(
      "赛季规则",
    );
    const navLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>(".docs-nav-child-link"));
    const vaultLink = navLinks.find((link) => link.textContent?.includes("牛马金库"));
    const taskCardsLink = navLinks.find((link) => link.textContent?.includes("四维任务卡池"));
    const helpLink = navLinks.find((link) => link.textContent?.includes("日常流程"));
    const faqLink = navLinks.find((link) => link.textContent?.includes("补给站 FAQ"));

    expect(vaultLink?.getAttribute("href")).toContain("tab=rules");
    expect(vaultLink?.getAttribute("href")).toContain("section=vault");
    expect(taskCardsLink?.getAttribute("href")).toContain("section=supply-station-task-cards");
    expect(helpLink?.getAttribute("href")).toContain("section=supply-station-help");
    expect(faqLink?.getAttribute("href")).toContain("section=supply-station-faq");
    expect(container.querySelector("main")?.textContent).toContain("我的银子");
    expect(container.querySelector("main")?.textContent).not.toContain("牛马金库");
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

    expect(vaultLink).not.toBeNull();

    await act(async () => {
      vaultLink!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector("main")?.textContent).toContain("牛马金库");
    expect(container.querySelector("main")?.textContent).not.toContain("我的银子");
    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=rules&section=vault", { scroll: false });

    await act(async () => {
      faqButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("main")?.textContent).toContain("为什么今天打卡了但冲刺条没再涨？");
    expect(container.textContent).not.toContain("赛季开始 / 结束逻辑");
    const docsDropdownLink = Array.from(container.querySelectorAll<HTMLAnchorElement>(".docs-nav-child-link")).find(
      (link) => link.textContent?.includes("为什么文档中心放在下拉里？"),
    );
    expect(docsDropdownLink?.getAttribute("href")).toContain("section=docs-dropdown");
    expect(container.querySelector('.docs-nav-primary[aria-expanded="true"]')?.textContent).toContain(
      "常见问题",
    );
    expect(rulesButton?.getAttribute("aria-pressed")).toBe("false");
    expect(faqButton?.getAttribute("aria-pressed")).toBe("true");
    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=faq&section=why-no-sprint", { scroll: false });
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
      root.render(<DocsCenter initialSection="supply-station-rules" initialTab="rules" />);
    });

    expect(container.textContent).toContain("补给站玩法规则");
    expect(container.textContent).toContain("每天最多两张免费券");
    expect(container.textContent).toContain("十连消耗 10 张券");
    expect(container.textContent).toContain("抽奖概率说明");
    expect(container.querySelector("main")?.textContent).not.toContain("四维任务卡池");
    expect(container.querySelector("#supply-station-rules")).not.toBeNull();
    expect(container.querySelector("#supply-station-probability")).toBeNull();
    const probabilityLink = Array.from(container.querySelectorAll<HTMLAnchorElement>(".docs-nav-child-link")).find(
      (link) => link.textContent?.includes("抽奖概率说明"),
    );
    expect(probabilityLink?.getAttribute("href")).toContain("section=supply-station-probability");
  });

  it("falls back to /docs when pathname is unavailable", async () => {
    pathnameMock = null;

    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    const vaultLink = Array.from(container.querySelectorAll<HTMLAnchorElement>(".docs-nav-child-link")).find((link) =>
      link.textContent?.includes("牛马金库"),
    );
    expect(vaultLink?.getAttribute("href")).toContain("section=vault");

    const faqButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("常见问题"),
    );

    expect(faqButton).toBeDefined();

    await act(async () => {
      faqButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=faq&section=why-no-sprint", { scroll: false });
  });
});
