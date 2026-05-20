import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bannedRenderedTerms = ["补给券", "生命票", "体力", "扩容", "帮助中心", "意见反馈", "设置"];

function renderAllSupplyUiLabScenes() {
  return (
    <>
      <SupplyDashboardScene data={supplyDashboardMock} />
      <SupplyTeamGoalScene data={supplyTeamGoalMock} />
      <SupplyShopScene data={supplyShopMock} />
      <SupplyTaskRecordScene data={supplyTaskRecordMock} />
      <SupplyDrawPoolScene data={supplyDrawPoolMock} />
      <SupplyBackpackScene data={supplyBackpackMock} />
    </>
  );
}

describe("Supply UI Lab static business closure", () => {
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

  it("keeps all rendered UI Lab pages on the Phase 2 vocabulary", async () => {
    await act(async () => {
      root.render(renderAllSupplyUiLabScenes());
    });

    const renderedText = container.textContent ?? "";

    for (const term of bannedRenderedTerms) {
      expect(renderedText).not.toContain(term);
    }

    expect(renderedText).toContain("抽奖券");
    expect(renderedText).toContain("背包");
  });

  it("does not render dead main-flow anchors", async () => {
    await act(async () => {
      root.render(renderAllSupplyUiLabScenes());
    });

    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(container.querySelector('a[href="#help"]')).toBeNull();
    expect(container.querySelector('a[href="#feedback"]')).toBeNull();
    expect(container.querySelector('a[href="#settings"]')).toBeNull();
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
  });
});
