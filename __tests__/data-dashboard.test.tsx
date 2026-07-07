import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataDashboard } from "@/components/data-dashboard/DataDashboard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (loader.name === "loadDashboardBoard") {
      return function MockPersonalDashboard() {
        return <section data-testid="personal-dashboard">个人看板内容</section>;
      };
    }

    return function MockTeamReport() {
      return <section data-testid="team-report">团队战报内容</section>;
    };
  },
}));

vi.mock("@/components/board/BoardTabLoadingShell", () => ({
  BoardTabLoadingShell: ({ label }: { label: string }) => <div data-testid="loading-shell">{label}</div>,
}));

describe("DataDashboard", () => {
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

  it("defaults to the personal dashboard view", async () => {
    await act(async () => {
      root.render(<DataDashboard />);
    });

    expect(container.textContent).toContain("数据看板");
    expect(container.querySelector("[data-testid='personal-dashboard']")).not.toBeNull();
    expect(container.querySelector("[data-testid='team-report']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='personal']")?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("false");
  });

  it("can start directly on the team report view", async () => {
    await act(async () => {
      root.render(<DataDashboard initialView="team" />);
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-testid='personal-dashboard']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });

  it("switches between the two secondary tabs without remounting the shell", async () => {
    await act(async () => {
      root.render(<DataDashboard />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-dashboard-tab='team']")?.click();
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-testid='personal-dashboard']")).toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });

  it("resyncs when the route supplies a new initial view", async () => {
    await act(async () => {
      root.render(<DataDashboard initialView="personal" />);
    });

    await act(async () => {
      root.render(<DataDashboard initialView="team" />);
    });

    expect(container.querySelector("[data-testid='team-report']")).not.toBeNull();
    expect(container.querySelector("[data-dashboard-tab='team']")?.getAttribute("aria-selected")).toBe("true");
  });
});
