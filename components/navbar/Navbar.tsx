"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { getAvatarUrl } from "@/lib/avatars";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

export function Navbar() {
  const { state, dispatch } = useBoard();
  const [profileOpen, setProfileOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const currentMember =
    state.members.find((member) => member.id === state.currentUserId) ??
    state.members[0] ??
    null;

  function handleTabChange(tab: "punch" | "board" | "coffee" | "calendar" | "dash") {
    dispatch({ type: "SET_TAB", tab });
    setMobileTabsOpen(false);
  }

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

  return (
    <>
      <nav ref={navRef} className="w-full shrink-0 px-2 py-2 z-50">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-lg border-2 border-slate-800 bg-white shadow-[0_2px_0_0_#1f2937]">
                <Image
                  src="/logo.png"
                  alt="脱脂牛马 Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              脱脂牛马
            </div>
            <div className="calendar-tab-strip hidden min-w-0 gap-2 overflow-x-auto rounded-full border-2 border-slate-200 bg-slate-100 p-1 min-[761px]:flex">
              <TabBtn
                active={state.activeTab === "punch"}
                onClick={() => handleTabChange("punch")}
              >
                <AssetIcon name="workout" className="h-4 w-4 object-contain" />
                健身打卡
              </TabBtn>
              <TabBtn
                active={state.activeTab === "board"}
                className="board-tab"
                onClick={() => handleTabChange("board")}
              >
                <AssetIcon name="board" className="h-4 w-4 object-contain" />
                共享看板
              </TabBtn>
              <TabBtn
                active={state.activeTab === "coffee"}
                className="coffee-tab"
                onClick={() => handleTabChange("coffee")}
              >
                <AssetIcon name="coffee" className="h-4 w-4 object-contain" />
                续命咖啡
              </TabBtn>
              <TabBtn
                active={state.activeTab === "calendar"}
                className="calendar-tab"
                onClick={() => handleTabChange("calendar")}
              >
                <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
                牛马日历
              </TabBtn>
              <TabBtn
                active={state.activeTab === "dash"}
                className="report-tab"
                onClick={() => handleTabChange("dash")}
              >
                <AssetIcon name="report" className="h-4 w-4 object-contain" />
                战报中心
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
            <button
              onClick={handleProfileClick}
              disabled={!currentMember}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 hover:border-slate-800 transition-colors"
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
              active={state.activeTab === "punch"}
              className="mobile-tab-btn justify-between"
              onClick={() => handleTabChange("punch")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="workout" className="h-4 w-4 object-contain" />
                健身打卡
              </span>
            </TabBtn>
            <TabBtn
              active={state.activeTab === "board"}
              className="mobile-tab-btn board-tab justify-between"
              onClick={() => handleTabChange("board")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="board" className="h-4 w-4 object-contain" />
                共享看板
              </span>
            </TabBtn>
            <TabBtn
              active={state.activeTab === "coffee"}
              className="mobile-tab-btn coffee-tab justify-between"
              onClick={() => handleTabChange("coffee")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="coffee" className="h-4 w-4 object-contain" />
                续命咖啡
              </span>
            </TabBtn>
            <TabBtn
              active={state.activeTab === "calendar"}
              className="mobile-tab-btn calendar-tab justify-between"
              onClick={() => handleTabChange("calendar")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="calendar" className="h-4 w-4 object-contain" />
                牛马日历
              </span>
            </TabBtn>
            <TabBtn
              active={state.activeTab === "dash"}
              className="mobile-tab-btn report-tab justify-between"
              onClick={() => handleTabChange("dash")}
            >
              <span className="flex items-center gap-2">
                <AssetIcon name="report" className="h-4 w-4 object-contain" />
                战报中心
              </span>
            </TabBtn>
          </div>
        ) : null}
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
