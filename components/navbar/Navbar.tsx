"use client";

import { useState, useRef, useCallback } from "react";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { SvgIcons } from "@/components/ui/SvgIcons";
import { getAvatarUrl } from "@/lib/avatars";

export function Navbar() {
  const { state, dispatch } = useBoard();
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const handleProfileClick = useCallback(() => {
    setProfileOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const currentMember = state.members.find((m) => m.id === state.currentUserId) || state.members[0];

  return (
    <nav ref={navRef} className="h-14 w-full flex items-center justify-between shrink-0 px-2 z-50">
      <div className="flex items-center gap-6">
        <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-300 border-2 border-slate-800 rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#1f2937] p-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.box }} />
          </div>
          ROOM TODO
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-full border-2 border-slate-200">
          <TabBtn
            active={state.activeTab === "punch"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "punch" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            协同打卡
          </TabBtn>
          <TabBtn
            active={state.activeTab === "dash"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "dash" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.chart }} />
            战报中心
          </TabBtn>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 hover:border-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
            <img src={getAvatarUrl(currentMember.avatarKey)} alt={currentMember.name} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-sm">{currentMember.name}</span>
        </button>
        {profileOpen && <ProfileDropdown onDismiss={handleClickOutside} />}
      </div>
    </nav>
  );
}
