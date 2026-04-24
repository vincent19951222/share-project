"use client";

import { useEffect, useRef, useState } from "react";
import { getAvatarUrl } from "@/lib/avatars";
import { AssetIcon } from "@/components/ui/AssetIcon";
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeGridProps {
  snapshot: CoffeeSnapshot;
  busy: boolean;
  onAddCup: () => void;
  onRemoveCup: () => void;
}

function CoffeeCupIcon({ cups }: { cups: number }) {
  return (
    <span className="flex flex-col items-center gap-0.5 text-xs leading-none">
      <AssetIcon
        name="coffee"
        className="h-6 w-6 object-contain"
      />
      <span>{cups}</span>
    </span>
  );
}

function CoffeeCell({
  cups,
  isFuture,
  isTodayForCurrentUser,
  busy,
  onOpenActions,
}: {
  cups: number;
  isFuture: boolean;
  isTodayForCurrentUser: boolean;
  busy: boolean;
  onOpenActions: () => void;
}) {
  if (isFuture) {
    return <div className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-2xl border-2 border-dashed border-orange-300" />;
  }

  if (isTodayForCurrentUser) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onOpenActions}
        aria-label={cups === 0 ? "确认今天咖啡打卡" : "调整今天咖啡杯数"}
        className={`grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-[3px] border-slate-900 font-black shadow-[0_4px_0_0_#1f2937] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
          cups === 0 ? "bg-yellow-300 text-xl" : "bg-orange-100 text-amber-950"
        }`}
      >
        {cups === 0 ? "+" : <CoffeeCupIcon cups={cups} />}
      </button>
    );
  }

  if (cups > 0) {
    return (
      <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-orange-100 font-black text-amber-950 shadow-[0_3px_0_0_rgba(63,42,29,0.65)]">
        <CoffeeCupIcon cups={cups} />
      </div>
    );
  }

  return (
    <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-2 border-orange-200 bg-orange-50 font-black text-orange-200">
      ·
    </div>
  );
}

export function CoffeeGrid({ snapshot, busy, onAddCup, onRemoveCup }: CoffeeGridProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const todayColumnRef = useRef<HTMLDivElement | null>(null);
  const currentUserRowIndex = snapshot.members.findIndex(
    (member) => member.id === snapshot.currentUserId,
  );
  const currentUserTodayCups = snapshot.stats.currentUserTodayCups;

  useEffect(() => {
    todayColumnRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [snapshot.today, snapshot.totalDays]);

  function runAndClose(action: () => void) {
    action();
    setActionsOpen(false);
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.45rem] border-[6px] border-orange-50 bg-white shadow-sm">
      <header className="flex min-h-20 items-center justify-between gap-4 border-b-[3px] border-orange-100 bg-orange-50 px-5 py-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
            Team Coffee Calendar
          </div>
          <h2 className="mt-1 text-3xl font-black leading-none text-amber-950">
            团队续命月历
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs font-black text-amber-800">
          <span>已续命</span>
          <span>空杯</span>
          <span>今天</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-28 shrink-0 flex-col border-r-[3px] border-orange-100 bg-orange-50">
          <div className="flex h-11 items-center justify-center border-b-[3px] border-orange-100 text-xs font-black text-amber-700">
            MEMBERS
          </div>
          <div className="flex flex-1 flex-col justify-between gap-2 p-3">
            {snapshot.members.map((member) => (
              <div key={member.id} className="flex h-14 min-w-0 items-center gap-2">
                <img
                  src={getAvatarUrl(member.avatarKey)}
                  alt={member.name}
                  className="h-9 w-9 shrink-0 rounded-full border-2 border-slate-900 bg-white object-cover"
                />
                <span className="min-w-0 truncate text-xs font-black text-amber-950">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-auto overflow-y-hidden scroll-smooth">
          <div className="flex h-11 w-max shrink-0 gap-2 border-b-[3px] border-orange-100 bg-orange-50 px-4">
            {Array.from({ length: snapshot.totalDays }, (_, index) => {
              const day = index + 1;
              return (
                <div
                  key={day}
                  ref={day === snapshot.today ? todayColumnRef : undefined}
                  className={`grid h-7 w-[3.25rem] place-items-center self-center rounded-full text-xs font-black ${
                    day === snapshot.today
                      ? "border-2 border-slate-900 bg-teal-200 text-slate-900 shadow-[0_2px_0_0_#1f2937]"
                      : "text-amber-700"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex w-max flex-1 flex-col justify-between gap-2 p-4">
            {snapshot.members.map((member, rowIndex) => (
              <div key={member.id} className="flex h-14 items-center gap-2">
                {Array.from({ length: snapshot.totalDays }, (_, index) => {
                  const day = index + 1;
                  return (
                    <CoffeeCell
                      key={day}
                      cups={snapshot.gridData[rowIndex]?.[index]?.cups ?? 0}
                      isFuture={day > snapshot.today}
                      isTodayForCurrentUser={
                        rowIndex === currentUserRowIndex && day === snapshot.today
                      }
                      busy={busy}
                      onOpenActions={() => setActionsOpen(true)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {actionsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/20 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coffee-calendar-dialog-title"
        >
          <div className="w-full max-w-sm rounded-[1.25rem] border-[4px] border-slate-900 bg-orange-50 p-5 shadow-[8px_8px_0_0_rgba(63,42,29,0.9)]">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
              Today Coffee
            </div>
            <h3
              id="coffee-calendar-dialog-title"
              className="mt-1 text-2xl font-black leading-tight text-amber-950"
            >
              {currentUserTodayCups === 0 ? "确认今天喝咖啡？" : "调整今天的杯数"}
            </h3>
            <p className="mt-3 text-sm font-bold text-amber-900">
              {currentUserTodayCups === 0
                ? "确认后会先记录为 1 杯，后面如果继续喝，可以再从这里加。"
                : `当前记录 ${currentUserTodayCups} 杯，可以继续 +1，也可以撤回最新一杯。`}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setActionsOpen(false)}
                className="rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937]"
              >
                取消
              </button>
              {currentUserTodayCups > 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAndClose(onRemoveCup)}
                  className="rounded-full border-[3px] border-slate-900 bg-orange-200 px-4 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937] disabled:cursor-wait disabled:opacity-60"
                >
                  -1 杯
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => runAndClose(onAddCup)}
                className="rounded-full border-[3px] border-slate-900 bg-teal-200 px-4 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937] disabled:cursor-wait disabled:opacity-60"
              >
                {currentUserTodayCups === 0 ? "确认 1 杯" : "+1 杯"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
