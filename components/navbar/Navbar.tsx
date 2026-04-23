"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { SvgIcons } from "@/components/ui/SvgIcons";
import { getAvatarUrl } from "@/lib/avatars";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

export function Navbar() {
  const { state, dispatch } = useBoard();
  const [profileOpen, setProfileOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const currentMember =
    state.members.find((member) => member.id === state.currentUserId) ??
    state.members[0] ??
    null;

  const handleProfileClick = useCallback(() => {
    if (!currentMember) {
      return;
    }
    setProfileOpen((prev) => !prev);
  }, [currentMember]);

  const handleClickOutside = useCallback(() => {
    setProfileOpen(false);
  }, []);

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
            <div className="calendar-tab-strip flex min-w-0 gap-2 overflow-x-auto rounded-full border-2 border-slate-200 bg-slate-100 p-1">
              <TabBtn
                active={state.activeTab === "punch"}
                onClick={() => dispatch({ type: "SET_TAB", tab: "punch" })}
              >
                <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
                协同打卡
              </TabBtn>
              <TabBtn
                active={state.activeTab === "board"}
                className="board-tab"
                onClick={() => dispatch({ type: "SET_TAB", tab: "board" })}
              >
                <span className="w-4 h-4" dangerouslySetInnerHTML={{ __html: SvgIcons.megaphone }} />
                共享看板
              </TabBtn>
              <TabBtn
                active={state.activeTab === "coffee"}
                className="coffee-tab"
                onClick={() => dispatch({ type: "SET_TAB", tab: "coffee" })}
              >
                <span className="w-4 h-4" aria-hidden="true">
                  ☕
                </span>
                续命咖啡
              </TabBtn>
              <TabBtn
                active={state.activeTab === "calendar"}
                className="calendar-tab"
                onClick={() => dispatch({ type: "SET_TAB", tab: "calendar" })}
              >
                <span className="text-sm leading-none" aria-hidden="true">
                  📅
                </span>
                牛马日历
              </TabBtn>
              <TabBtn
                active={state.activeTab === "dash"}
                className="report-tab"
                onClick={() => dispatch({ type: "SET_TAB", tab: "dash" })}
              >
                <span dangerouslySetInnerHTML={{ __html: SvgIcons.chart }} />
                战报中心
              </TabBtn>
            </div>
          </div>
          <div className="relative shrink-0">
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
            {profileOpen && currentMember ? <ProfileDropdown onDismiss={handleClickOutside} onEditProfile={() => { setProfileOpen(false); setEditModalOpen(true); }} /> : null}
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
