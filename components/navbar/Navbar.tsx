"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { preloadBoardTabComponent, preloadSupplyPanelComponent } from "@/components/board/tab-component-loaders";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { getAvatarUrl } from "@/lib/avatars";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { TeamDynamicsBell } from "./TeamDynamicsBell";
import {
  appTabRoutes,
  supplyNavItems,
  type SupplyNavContext,
  type SupplyPanelKey,
} from "@/lib/navigation-routes";
import type { AppTab } from "@/lib/types";

export function Navbar({
  activeSupplyPanel,
  activeTabOverride,
  supplyNavContext,
}: {
  activeSupplyPanel?: SupplyPanelKey;
  activeTabOverride?: AppTab;
  supplyNavContext?: SupplyNavContext | null;
} = {}) {
  const { state } = useBoard();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const [supplyMenuOpen, setSupplyMenuOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);
  const [pendingSupplyPanel, setPendingSupplyPanel] = useState<SupplyPanelKey | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const prefetchedTabsRef = useRef(false);
  const supplyMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();
  const currentMember =
    state.members.find((member) => member.id === state.currentUserId) ??
    state.members[0] ??
    null;
  const activeTab = activeTabOverride ?? state.activeTab;

  useEffect(() => {
    if (prefetchedTabsRef.current) {
      return;
    }

    prefetchedTabsRef.current = true;
    Object.values(appTabRoutes).forEach((route) => {
      router.prefetch?.(route);
    });
  }, [router]);

  const prefetchAppTab = useCallback(
    (tab: AppTab) => {
      router.prefetch?.(appTabRoutes[tab]);
      preloadBoardTabComponent(tab);
    },
    [router],
  );

  const prefetchSupplyPanel = useCallback(
    (panel: SupplyPanelKey) => {
      const item = supplyNavItems.find((candidate) => candidate.id === panel);
      if (item) {
        router.prefetch?.(item.route);
        preloadSupplyPanelComponent(panel);
      }
    },
    [router],
  );

  function handleTabChange(tab: AppTab) {
    setMobileTabsOpen(false);
    setSupplyMenuOpen(false);
    setPendingSupplyPanel(null);

    if (tab === activeTab) {
      return;
    }

    setPendingTab(tab);
    startTransition(() => {
      router.push(appTabRoutes[tab]);
    });
  }

  function handleSupplyPanelChange(panel: SupplyPanelKey) {
    const item = supplyNavItems.find((candidate) => candidate.id === panel);
    if (!item) {
      return;
    }

    setSupplyMenuOpen(false);

    if (panel === activeSupplyPanel) {
      return;
    }

    setPendingTab("supply");
    setPendingSupplyPanel(panel);
    startTransition(() => {
      router.push(item.route);
    });
  }

  const clearSupplyMenuCloseTimer = useCallback(() => {
    if (supplyMenuCloseTimerRef.current) {
      clearTimeout(supplyMenuCloseTimerRef.current);
      supplyMenuCloseTimerRef.current = null;
    }
  }, []);

  const openSupplyMenu = useCallback(() => {
    clearSupplyMenuCloseTimer();
    setSupplyMenuOpen(true);
  }, [clearSupplyMenuCloseTimer]);

  const scheduleSupplyMenuClose = useCallback(() => {
    clearSupplyMenuCloseTimer();
    supplyMenuCloseTimerRef.current = setTimeout(() => {
      setSupplyMenuOpen(false);
      supplyMenuCloseTimerRef.current = null;
    }, 220);
  }, [clearSupplyMenuCloseTimer]);

  useEffect(() => clearSupplyMenuCloseTimer, [clearSupplyMenuCloseTimer]);

  const handleProfileClick = useCallback(() => {
    if (!currentMember) {
      return;
    }
    setProfileOpen((prev) => !prev);
  }, [currentMember]);

  const handleClickOutside = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const mobileNavLabel = mobileTabsOpen ? "收起导航" : "展开导航";
  const showSupplyChrome = activeTab === "supply";

  useEffect(() => {
    if (pendingTab === activeTab) {
      setPendingTab(null);
    }
  }, [activeTab, pendingTab]);

  useEffect(() => {
    if (pendingSupplyPanel && pendingSupplyPanel === activeSupplyPanel) {
      setPendingSupplyPanel(null);
    }
  }, [activeSupplyPanel, pendingSupplyPanel]);

  return (
    <>
      <nav
        ref={navRef}
        className={`app-top-nav app-top-nav--with-supply-menu w-full shrink-0 px-2 py-2 z-50${
          showSupplyChrome ? " app-top-nav--supply" : ""
        }${supplyMenuOpen ? " app-supply-menu-open" : ""}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-lg border-2 border-slate-800 bg-white shadow-[0_2px_0_0_#1f2937]">
                <Image
                  src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_logo.png"
                  alt="脱脂牛马 Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              脱脂牛马
            </div>
            <div className="calendar-tab-strip home-tab-strip hidden min-w-0 gap-2 overflow-x-auto rounded-full border-2 border-slate-200 bg-slate-100 p-1 min-[761px]:flex">
              <TabBtn
                active={activeTab === "punch"}
                pending={pendingTab === "punch"}
                onFocus={() => prefetchAppTab("punch")}
                onMouseEnter={() => prefetchAppTab("punch")}
                onClick={() => handleTabChange("punch")}
              >
                <AssetIcon name="workout" className="h-4 w-4 object-contain" />
                健身打卡
              </TabBtn>
              <TabBtn
                active={activeTab === "board"}
                className="board-tab"
                pending={pendingTab === "board"}
                onFocus={() => prefetchAppTab("board")}
                onMouseEnter={() => prefetchAppTab("board")}
                onClick={() => handleTabChange("board")}
              >
                <AssetIcon name="board" className="h-4 w-4 object-contain" />
                共享看板
              </TabBtn>
              <TabBtn
                active={activeTab === "coffee"}
                className="coffee-tab"
                pending={pendingTab === "coffee"}
                onFocus={() => prefetchAppTab("coffee")}
                onMouseEnter={() => prefetchAppTab("coffee")}
                onClick={() => handleTabChange("coffee")}
              >
                <AssetIcon name="coffee" className="h-4 w-4 object-contain" />
                续命咖啡
              </TabBtn>
              <TabBtn
                active={activeTab === "calendar"}
                className="calendar-tab"
                pending={pendingTab === "calendar"}
                onFocus={() => prefetchAppTab("calendar")}
                onMouseEnter={() => prefetchAppTab("calendar")}
                onClick={() => handleTabChange("calendar")}
              >
                <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
                牛马日历
              </TabBtn>
              <TabBtn
                active={activeTab === "dash"}
                className="report-tab"
                pending={pendingTab === "dash"}
                onFocus={() => prefetchAppTab("dash")}
                onMouseEnter={() => prefetchAppTab("dash")}
                onClick={() => handleTabChange("dash")}
              >
                <AssetIcon name="report" className="h-4 w-4 object-contain" />
                战报中心
              </TabBtn>
              <TabBtn
                active={activeTab === "supply"}
                className="supply-tab app-supply-primary-tab"
                onBlur={scheduleSupplyMenuClose}
                pending={pendingTab === "supply"}
                onFocus={() => {
                  openSupplyMenu();
                  prefetchAppTab("supply");
                }}
                onMouseEnter={() => {
                  openSupplyMenu();
                  prefetchAppTab("supply");
                }}
                onMouseLeave={scheduleSupplyMenuClose}
                onClick={() => handleTabChange("supply")}
              >
                <AssetIcon name="supply" className="h-4 w-4 object-contain" />
                牛马补给站
              </TabBtn>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={mobileNavLabel}
              aria-expanded={mobileTabsOpen}
              onClick={() => setMobileTabsOpen((open) => !open)}
              className="mobile-nav-toggle flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-xl font-black text-slate-800 shadow-[0_3px_0_0_#1f2937] min-[761px]:hidden"
            >
              <span aria-hidden="true">{mobileTabsOpen ? "×" : "≡"}</span>
            </button>
            <TeamDynamicsBell />
            <div
              aria-busy={!supplyNavContext}
              aria-label={supplyNavContext ? "补给站资产" : "补给站资产加载中"}
              className={`app-supply-assets${supplyNavContext ? "" : " app-supply-assets--loading"}`}
            >
              {supplyNavContext ? (
                supplyNavContext.resources.map((resource) => {
                  const valueLabel = resource.maxValue ? `${resource.value}/${resource.maxValue}` : `${resource.value}`;

                  return (
                    <button
                      aria-label={`${resource.label} ${valueLabel}`}
                      className={`app-supply-asset-chip app-supply-asset-chip--${resource.id}`}
                      key={resource.id}
                      type="button"
                    >
                      <img src={resource.iconImage} alt="" aria-hidden="true" />
                      <span>{resource.label}</span>
                      <strong>{valueLabel}</strong>
                    </button>
                  );
                })
              ) : (
                ["coins", "ticket", "backpack"].map((resourceId) => (
                  <span
                    aria-hidden="true"
                    className={`app-supply-asset-chip app-supply-asset-skeleton app-supply-asset-chip--${resourceId}`}
                    key={resourceId}
                  >
                    <i />
                    <strong />
                  </span>
                ))
              )}
            </div>
            <button
              onClick={handleProfileClick}
              disabled={!currentMember}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 text-slate-900 hover:border-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                {currentMember ? (
                  <img src={getAvatarUrl(currentMember.avatarKey)} alt={currentMember.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black text-slate-400">?</span>
                )}
              </div>
              <span className="font-bold text-sm">{currentMember?.name ?? "未分配成员"}</span>
            </button>
            {profileOpen && currentMember ? (
              <ProfileDropdown
                onDismiss={handleClickOutside}
                onEditProfile={() => {
                  setProfileOpen(false);
                  setEditModalOpen(true);
                }}
              />
            ) : null}
          </div>
        </div>
        {mobileTabsOpen ? (
          <div className="mobile-tab-panel mt-3 flex flex-col gap-2 rounded-[1.5rem] border-4 border-slate-800 bg-white p-3 shadow-[0_8px_0_0_#1f2937] min-[761px]:hidden">
            <TabBtn
              active={activeTab === "punch"}
              className="mobile-tab-btn justify-between"
              pending={pendingTab === "punch"}
              onFocus={() => prefetchAppTab("punch")}
              onMouseEnter={() => prefetchAppTab("punch")}
              onClick={() => handleTabChange("punch")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="workout" className="h-4 w-4 object-contain" />
                健身打卡
              </span>
            </TabBtn>
            <TabBtn
              active={activeTab === "board"}
              className="mobile-tab-btn board-tab justify-between"
              pending={pendingTab === "board"}
              onFocus={() => prefetchAppTab("board")}
              onMouseEnter={() => prefetchAppTab("board")}
              onClick={() => handleTabChange("board")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="board" className="h-4 w-4 object-contain" />
                共享看板
              </span>
            </TabBtn>
            <TabBtn
              active={activeTab === "coffee"}
              className="mobile-tab-btn coffee-tab justify-between"
              pending={pendingTab === "coffee"}
              onFocus={() => prefetchAppTab("coffee")}
              onMouseEnter={() => prefetchAppTab("coffee")}
              onClick={() => handleTabChange("coffee")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="coffee" className="h-4 w-4 object-contain" />
                续命咖啡
              </span>
            </TabBtn>
            <TabBtn
              active={activeTab === "calendar"}
              className="mobile-tab-btn calendar-tab justify-between"
              pending={pendingTab === "calendar"}
              onFocus={() => prefetchAppTab("calendar")}
              onMouseEnter={() => prefetchAppTab("calendar")}
              onClick={() => handleTabChange("calendar")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
                牛马日历
              </span>
            </TabBtn>
            <TabBtn
              active={activeTab === "dash"}
              className="mobile-tab-btn report-tab justify-between"
              pending={pendingTab === "dash"}
              onFocus={() => prefetchAppTab("dash")}
              onMouseEnter={() => prefetchAppTab("dash")}
              onClick={() => handleTabChange("dash")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="report" className="h-4 w-4 object-contain" />
                战报中心
              </span>
            </TabBtn>
            <TabBtn
              active={activeTab === "supply"}
              className="mobile-tab-btn supply-tab justify-between"
              pending={pendingTab === "supply"}
              onFocus={() => prefetchAppTab("supply")}
              onMouseEnter={() => prefetchAppTab("supply")}
              onClick={() => handleTabChange("supply")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="supply" className="h-4 w-4 object-contain" />
                牛马补给站
              </span>
            </TabBtn>
          </div>
        ) : null}
        <div
          className="app-supply-secondary-nav"
          aria-label="牛马补给站分区导航"
          onBlur={scheduleSupplyMenuClose}
          onFocus={openSupplyMenu}
          onMouseEnter={openSupplyMenu}
          onMouseLeave={scheduleSupplyMenuClose}
        >
          <div className="app-supply-secondary-rail" role="tablist">
            {supplyNavItems.map((item) => {
              const selected = item.id === (activeSupplyPanel ?? "dashboard");

              return (
                <button
                  aria-current={selected ? "page" : undefined}
                  aria-selected={selected}
                  className={`app-supply-secondary-tab${pendingSupplyPanel === item.id ? " pending" : ""}`}
                  key={item.id}
                  onFocus={() => prefetchSupplyPanel(item.id)}
                  onMouseEnter={() => prefetchSupplyPanel(item.id)}
                  onClick={() => handleSupplyPanelChange(item.id)}
                  role="tab"
                  type="button"
                >
                  <img alt="" aria-hidden="true" src={item.iconImage} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
      {editModalOpen && currentMember ? (
        <EditProfileModal
          currentUsername={currentMember.name}
          currentAvatarKey={currentMember.avatarKey}
          onClose={() => setEditModalOpen(false)}
        />
      ) : null}
    </>
  );
}
