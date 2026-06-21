import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeriodNavigator } from "@/components/dashboard/PeriodNavigator";
import type { DashboardScope } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date("2026-06-15T03:00:00Z");

describe("PeriodNavigator", () => {
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

  it("renders current period label and disables next at current", () => {
    const scope: DashboardScope = { type: "month", monthKey: "2026-06" };
    act(() => {
      root.render(<PeriodNavigator scope={scope} onScopeChange={() => {}} now={NOW} />);
    });
    expect(container.textContent).toContain("2026年6月");
    // 按钮顺序：‹ label › 按月 按年
    const buttons = container.querySelectorAll("button");
    const prevBtn = buttons[0];
    const nextBtn = buttons[2];
    expect(nextBtn.disabled).toBe(true);
    expect(prevBtn.disabled).toBe(false);
  });

  it("enables next when viewing a historical month", () => {
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={() => {}}
          now={NOW}
        />,
      );
    });
    const nextBtn = container.querySelectorAll("button")[2] as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);
  });

  it("clicking prev calls onScopeChange with previous month", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-06" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const prevBtn = container.querySelectorAll("button")[0] as HTMLButtonElement;
    act(() => prevBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "month", monthKey: "2026-05" });
  });

  it("clicking the label resets to current", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const labelBtn = container.querySelector("button[data-period-label]") as HTMLButtonElement;
    expect(labelBtn).not.toBeNull();
    act(() => labelBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "month", monthKey: "2026-06" });
  });

  it("clicking 按年 toggles to current year scope", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const yearBtn = container.querySelector("button[data-granularity='year']") as HTMLButtonElement;
    act(() => yearBtn.click());
    expect(onChange).toHaveBeenCalledWith({ type: "year", year: 2026 });
  });

  it("clicking 按月 when already month does nothing", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <PeriodNavigator
          scope={{ type: "month", monthKey: "2026-05" }}
          onScopeChange={onChange}
          now={NOW}
        />,
      );
    });
    const monthBtn = container.querySelector("button[data-granularity='month']") as HTMLButtonElement;
    act(() => monthBtn.click());
    expect(onChange).not.toHaveBeenCalled();
  });
});
