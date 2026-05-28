"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import { SupplyStation } from "@/components/gamification/SupplyStation";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import {
  appTabRoutes,
  supplyPanelRoutes,
  type SupplyNavContext,
  type SupplyPanelKey,
} from "@/lib/navigation-routes";
import { CoffeeProvider } from "@/lib/coffee-store";
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
        return <SharedBoard isActive={activeTab === "board"} />;
      case "coffee":
        return <CoffeeCheckin />;
      case "supply":
        return (
          <SupplyStation
            initialPanel={supplyPanel}
            onBackToPunch={handleBackToPunch}
            onNavContextChange={handleSupplyNavContextChange}
            onPanelChange={handleSupplyPanelChange}
          />
        );
      case "calendar":
        return <CalendarBoard />;
      case "dash":
        return <ReportCenter />;
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

  if (activeTab === "coffee" || activeTab === "dash") {
    return <CoffeeProvider>{pageShell}</CoffeeProvider>;
  }

  return pageShell;
}
