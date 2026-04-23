"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ProfileDropdownProps {
  onDismiss: () => void;
  onEditProfile: () => void;
}

export function ProfileDropdown({ onDismiss, onEditProfile }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { state } = useBoard();
  const currentUser = state.currentUser;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.classList.add("show");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onDismiss} />
      <div
        ref={ref}
        className="dropdown-menu flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sub">我的银子</span>
            <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
              {currentUser?.assetBalance ?? 0}
            </div>
          </div>
        </div>
        <div className="p-5 border-t-2 border-slate-100 bg-slate-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span>连签</span>
            <span className="text-slate-700">{currentUser?.currentStreak ?? 0} 天</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span>下次奖励</span>
            <span className="text-slate-700">{currentUser?.nextReward ?? 0} 银子</span>
          </div>
          {currentUser?.isAdmin ? (
            <Link
              href="/admin"
              className="mt-2 w-full py-2 text-center text-sm font-bold text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
            >
              赛季设置
            </Link>
          ) : null}
          <button
            onClick={onEditProfile}
            className="mt-2 w-full py-2 text-sm font-bold text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
          >
            编辑资料
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 w-full py-2 text-sm font-bold text-red-500 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
