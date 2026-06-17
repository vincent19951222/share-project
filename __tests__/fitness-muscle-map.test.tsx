import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FitnessMuscleMap } from "@/components/ui/FitnessMuscleMap";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("FitnessMuscleMap", () => {
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

  it("renders the remote static webp illustration", () => {
    act(() => {
      root.render(<FitnessMuscleMap cardioActive={true} selectedParts={["chest"]} />);
    });

    const image = container.querySelector('img[alt="今日训练部位肌肉图"]');

    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toBe(
      "/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.webp",
    );
    expect(container.querySelector('svg[aria-label="今日训练部位肌肉图"]')).toBeNull();
    expect(container.querySelector("[data-muscle-part]")).toBeNull();
  });

  it("keeps the illustration static when workout selections change", () => {
    act(() => {
      root.render(<FitnessMuscleMap cardioActive={true} selectedParts={[]} />);
    });

    act(() => {
      root.render(<FitnessMuscleMap cardioActive={true} selectedParts={["chest", "abs"]} />);
    });

    expect(container.querySelectorAll('img[alt="今日训练部位肌肉图"]')).toHaveLength(1);
    expect(container.querySelector("[data-muscle-part]")).toBeNull();
  });
});
