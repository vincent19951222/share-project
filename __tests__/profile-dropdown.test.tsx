import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileDropdown } from "@/components/navbar/ProfileDropdown";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("ProfileDropdown", () => {
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

  it("does not render the achievements section", () => {
    act(() => {
      root.render(<ProfileDropdown onDismiss={() => {}} onEditProfile={() => {}} />);
    });

    expect(container.textContent).not.toContain("ACHIEVEMENTS");
    expect(container.textContent).not.toContain("初级举铁匠");
    expect(container.textContent).not.toContain("慢跑达人");
  });
});
