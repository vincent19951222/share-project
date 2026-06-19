"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicCalendarBoard,
  DynamicDashboardBoard,
  DynamicDrinkCheckin,
  DynamicReportCenter,
  DynamicSharedBoard,
  DynamicSupplyStation,
} from "@/components/board/dynamic-tabs";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import {
  appTabRoutes,
  supplyPanelRoutes,
  type SupplyNavContext,
  type SupplyPanelKey,
} from "@/lib/navigation-routes";
import { DrinkProvider } from "@/lib/drink-store";
import { useBoard } from "@/lib/store";
import {
  cacheSupplyNavContext,
  ensureSupplyNavContext,
  getCachedSupplyNavContext,
} from "@/lib/supply-nav-cache";
import type { AppTab } from "@/lib/types";

export function BoardApp({
  activeTab,
  supplyPanel = "dashboard",
}: {
  activeTab: AppTab;
  supplyPanel?: SupplyPanelKey;
}) {
  const { state } = useBoard();
  const router = useRouter();
  const [supplyNavContext, setSupplyNavContext] = useState<SupplyNavContext | null>(() =>
    getCachedSupplyNavContext(state.currentUserId),
  );

  useEffect(() => {
    if (activeTab === "supply") {
      return;
    }

    const cachedContext = getCachedSupplyNavContext(state.currentUserId);
    if (cachedContext) {
      setSupplyNavContext(cachedContext);
      return;
    }

    let cancelled = false;

    async function loadNavContext() {
      try {
        const context = await ensureSupplyNavContext(state.currentUserId);
        if (!cancelled) {
          setSupplyNavContext(context);
        }
      } catch {
        if (!cancelled && !getCachedSupplyNavContext(state.currentUserId)) {
          setSupplyNavContext(null);
        }
      }
    }

    void loadNavContext();

    return () => {
      cancelled = true;
    };
  }, [activeTab, state.currentUserId]);

  const handleBackToPunch = useCallback(() => {
    router.push(appTabRoutes.punch);
  }, [router]);

  const handleSupplyNavContextChange = useCallback((context: SupplyNavContext | null) => {
    cacheSupplyNavContext(context, state.currentUserId);
    setSupplyNavContext(context);
  }, [state.currentUserId]);

  const handleSupplyPanelChange = useCallback(
    (panel: SupplyPanelKey) => {
      router.push(supplyPanelRoutes[panel]);
    },
    [router],
  );

  const activeContent = (() => {
    switch (activeTab) {
      case "punch":
        return <PunchBoard />;
      case "board":
        return <DynamicSharedBoard isActive={activeTab === "board"} />;
      case "coffee":
        return <DynamicDrinkCheckin />;
      case "supply":
        return (
          <DynamicSupplyStation
            initialPanel={supplyPanel}
            onBackToPunch={handleBackToPunch}
            onNavContextChange={handleSupplyNavContextChange}
            onPanelChange={handleSupplyPanelChange}
          />
        );
      case "calendar":
        return <DynamicDashboardBoard />;
      case "dash":
        return <DynamicReportCenter />;
      default:
        return <PunchBoard />;
    }
  })();

  const pageShell = (
    <>
      <Navbar
        activeSupplyPanel={activeTab === "supply" ? supplyPanel : undefined}
        activeTabOverride={activeTab}
        supplyNavContext={supplyNavContext}
      />
      <div className="board-tab-stage flex-1 w-full relative overflow-hidden">
        <div className="board-tab-panel board-tab-panel-active absolute inset-0 opacity-100 transition-opacity duration-300">
          {activeContent}
        </div>
      </div>
    </>
  );

  if (activeTab === "coffee") {
    return <DrinkProvider>{pageShell}</DrinkProvider>;
  }

  if (activeTab === "dash") {
    return <DrinkProvider>{pageShell}</DrinkProvider>;
  }

  return pageShell;
}
