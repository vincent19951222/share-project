"use client";

import { getAvatarUrl } from "@/lib/avatars";
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeGridProps {
  snapshot: CoffeeSnapshot;
}

function CoffeeCell({
  cups,
  isFuture,
  isTodayForCurrentUser,
}: {
  cups: number;
  isFuture: boolean;
  isTodayForCurrentUser: boolean;
}) {
  if (isFuture) {
    return <div className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-2xl border-2 border-dashed border-orange-300" />;
  }

  if (isTodayForCurrentUser && cups === 0) {
    return (
      <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-[3px] border-slate-900 bg-yellow-300 text-xl font-black shadow-[0_4px_0_0_#1f2937]">
        +
      </div>
    );
  }

  if (cups > 0) {
    return (
      <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-orange-100 font-black text-amber-950 shadow-[0_3px_0_0_rgba(63,42,29,0.65)]">
        <span className="flex flex-col items-center text-xs leading-none">
          <span aria-hidden="true">☕</span>
          <span>☕ {cups}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border-2 border-orange-200 bg-orange-50 font-black text-orange-200">
      ·
    </div>
  );
}

export function CoffeeGrid({ snapshot }: CoffeeGridProps) {
  const currentUserRowIndex = snapshot.members.findIndex(
    (member) => member.id === snapshot.currentUserId,
  );

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
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
