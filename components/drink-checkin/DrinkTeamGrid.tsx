"use client";

import { getAvatarUrl } from "@/lib/avatars";
import type { DrinkSnapshot } from "@/lib/types";

interface DrinkTeamGridProps {
  snapshot: DrinkSnapshot;
}

export function DrinkTeamGrid({ snapshot }: DrinkTeamGridProps) {
  const visibleDays = Array.from({ length: Math.min(snapshot.totalDays, 7) }, (_, index) => index + 1);

  return (
    <section className="rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[8px_8px_0_rgba(15,23,42,0.24)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-cyan-700">Team Hydration Board</p>
          <h2 className="text-2xl font-black leading-tight text-slate-950">团队喝水打卡</h2>
        </div>
        <span className="rounded-full border-2 border-slate-950 bg-yellow-200 px-3 py-1 text-xs font-black">
          团队看板
        </span>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[720px] space-y-2">
          <div className="grid grid-cols-[150px_repeat(7,minmax(60px,1fr))] gap-2 text-xs font-black text-slate-500">
            <span>成员</span>
            {visibleDays.map((day) => (
              <span key={day} className={day === snapshot.today ? "text-cyan-700" : ""}>
                {day === snapshot.today ? "今天" : `${day}日`}
              </span>
            ))}
          </div>

          {snapshot.members.map((member, memberIndex) => (
            <div
              className="grid grid-cols-[150px_repeat(7,minmax(60px,1fr))] gap-2"
              key={member.id}
            >
              <span className="flex items-center gap-2 rounded-[8px] border-2 border-slate-200 bg-white px-2 py-2 text-sm font-black">
                <img
                  src={getAvatarUrl(member.avatarKey)}
                  alt=""
                  className="h-7 w-7 rounded-full border border-slate-200 object-cover"
                />
                {member.name}
              </span>
              {visibleDays.map((day) => {
                const cups = snapshot.gridData[memberIndex]?.[day - 1]?.cups ?? 0;

                return (
                  <span
                    className={`grid min-h-11 place-items-center rounded-[8px] border-2 text-sm font-black ${
                      cups > 0
                        ? "border-cyan-900 bg-cyan-100 text-cyan-900"
                        : "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                    }`}
                    key={`${member.id}-${day}`}
                  >
                    {cups > 0 ? cups : ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
