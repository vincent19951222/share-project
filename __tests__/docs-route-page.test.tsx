import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocsPage from "@/app/(board)/docs/page";

vi.mock("@/components/docs-center/DocsCenter", () => ({
  DocsCenter: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="docs-center">docs center: {initialTab}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("DocsPage route", () => {
  let container: HTMLDivElement;
  let root: Root;
  const routeSource = readFileSync(
    path.join(process.cwd(), "app", "(board)", "docs", "page.tsx"),
    "utf8",
  );

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

  it("normalizes unknown query tabs and renders the standalone docs shell", async () => {
    const element = await DocsPage({
      searchParams: Promise.resolve({ tab: "unknown" }),
    });

    await act(async () => {
      root.render(element);
    });

    expect(container.querySelector('[data-testid="docs-center"]')?.textContent).toContain(
      "changelog",
    );
  });

  it("stays standalone by avoiding Navbar imports and deriving tabs from docs content", () => {
    expect(routeSource).not.toContain('from "@/components/navbar/Navbar"');
    expect(routeSource).toContain('from "@/content/docs-center/tabs"');
    expect(routeSource).toContain("flex h-full min-h-0 flex-col");
    expect(routeSource).toContain("flex-1 overflow-y-auto");
  });
});
