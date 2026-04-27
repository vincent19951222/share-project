import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocsPage from "@/app/(board)/docs/page";

vi.mock("@/components/navbar/Navbar", () => ({
  Navbar: () => <div data-testid="navbar-shell">shared navbar</div>,
}));

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
    expect(container.querySelector('[data-testid="navbar-shell"]')).toBeNull();
  });
});
