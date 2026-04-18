"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QuestBtn } from "@/components/ui/QuestBtn";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ProfileDropdownProps {
  onDismiss: () => void;
  onEditProfile: () => void;
}

export function ProfileDropdown({ onDismiss, onEditProfile }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      {/* Invisible overlay to capture outside clicks */}
      <div className="fixed inset-0 z-[99]" onClick={onDismiss} />
      <div ref={ref} className="dropdown-menu flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sub">ASSET BALANCE</span>
            <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
              3,450
            </div>
          </div>
          <QuestBtn className="px-3 py-1 text-xs">提现</QuestBtn>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-sub">ACHIEVEMENTS (3)</span>
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-orange-100 border-2 border-orange-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="初级举铁匠">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.weightlift }} />
            </div>
            <div className="w-12 h-12 bg-blue-100 border-2 border-blue-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="慢跑达人">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.runner }} />
            </div>
            <div className="w-12 h-12 bg-green-100 border-2 border-green-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="早起鸟">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.bird }} />
            </div>
          </div>
        </div>
        <div className="p-5 border-t-2 border-slate-100 bg-slate-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span>关联 App</span>
            <span className="text-green-500 bg-green-100 px-2 py-0.5 rounded text-xs">Apple Health 已连</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span>每日提醒</span>
            <span className="text-sub">18:30</span>
          </div>
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
