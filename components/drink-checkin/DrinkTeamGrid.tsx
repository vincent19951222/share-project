"use client";

import { useState } from "react";
import { drinkItems } from "./drink-catalog";
import { drinkNoteOptions, pickDrinkNote } from "./drink-entry";
import { getAvatarUrl } from "@/lib/avatars";
import type { DrinkType } from "@/lib/drinks";
import type { DrinkSnapshot } from "@/lib/types";

interface DrinkTeamGridProps {
  snapshot: DrinkSnapshot;
  busy?: boolean;
  error?: string | null;
  onMakeupDrink?: (input: {
    drinkType: DrinkType;
    note?: string | null;
    dayKey?: string;
  }) => Promise<boolean>;
}

interface MakeupEntry {
  day: number;
  dayKey: string;
  drinkType: DrinkType;
  note: string;
}

function getCurrentShanghaiMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? "01";

  return `${year}-${month}`;
}

function buildDayKey(day: number, monthKey?: string) {
  return `${monthKey ?? getCurrentShanghaiMonthKey()}-${String(day).padStart(2, "0")}`;
}

export function DrinkTeamGrid({
  busy = false,
  error = null,
  onMakeupDrink,
  snapshot,
}: DrinkTeamGridProps) {
  const [makeupEntry, setMakeupEntry] = useState<MakeupEntry | null>(null);
  const lastVisibleDay = Math.max(1, Math.min(snapshot.today, snapshot.totalDays));
  const firstVisibleDay = Math.max(1, lastVisibleDay - 6);
  const visibleDays = Array.from(
    { length: lastVisibleDay - firstVisibleDay + 1 },
    (_, index) => firstVisibleDay + index,
  );
  const selectedDrink = makeupEntry
    ? (drinkItems.find((drink) => drink.type === makeupEntry.drinkType) ?? drinkItems[0])
    : null;

  function openMakeup(day: number) {
    setMakeupEntry({
      day,
      dayKey: buildDayKey(day, snapshot.monthKey),
      drinkType: "water",
      note: pickDrinkNote(),
    });
  }

  async function confirmMakeup() {
    if (!makeupEntry || !onMakeupDrink) {
      return;
    }

    const confirmed = await onMakeupDrink({
      drinkType: makeupEntry.drinkType,
      note: makeupEntry.note,
      dayKey: makeupEntry.dayKey,
    });

    if (confirmed) {
      setMakeupEntry(null);
    }
  }

  return (
    <section className="drink-team-board rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[8px_8px_0_rgba(15,23,42,0.24)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-cyan-700">Team Hydration Board</p>
          <h2 className="text-2xl font-black leading-tight text-slate-950">团队喝水打卡</h2>
        </div>
        <span className="rounded-full border-2 border-slate-950 bg-yellow-200 px-3 py-1 text-xs font-black">
          团队看板
        </span>
      </header>

      <div className="drink-team-scroll overflow-x-auto">
        <div className="drink-team-table min-w-[720px] space-y-2">
          <div className="grid grid-cols-[150px_repeat(7,minmax(60px,1fr))] gap-2 text-xs font-black text-slate-500">
            <span>成员</span>
            {visibleDays.map((day) => (
              <span
                key={day}
                className={`text-center ${day === snapshot.today ? "text-cyan-700" : ""}`}
              >
                {day === snapshot.today ? "今天" : day === snapshot.today - 1 ? "昨天" : `${day}日`}
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
                const isYesterday = day === snapshot.today - 1;
                const canMakeup =
                  Boolean(onMakeupDrink) &&
                  member.id === snapshot.currentUserId &&
                  isYesterday;
                const cellClassName = `grid min-h-11 place-items-center rounded-[8px] border-2 text-sm font-black ${
                  cups > 0
                    ? "border-cyan-900 bg-cyan-100 text-cyan-900"
                    : "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                }`;

                if (canMakeup) {
                  return (
                    <button
                      aria-label={`补记 ${day}日 水铺记录`}
                      className={`${cellClassName} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
                      disabled={busy}
                      key={`${member.id}-${day}`}
                      onClick={() => openMakeup(day)}
                      type="button"
                    >
                      {cups > 0 ? cups : ""}
                    </button>
                  );
                }

                return (
                  <span className={cellClassName} key={`${member.id}-${day}`}>
                    {cups > 0 ? cups : ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {makeupEntry && selectedDrink ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          role="presentation"
        >
          <section
            aria-labelledby="drink-makeup-title"
            aria-modal="true"
            className="w-full max-w-[500px] rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[12px_12px_0_rgba(15,23,42,0.45)]"
            role="dialog"
          >
            <header className="mb-4">
              <p className="text-xs font-black uppercase text-cyan-700">Niuma Water Shop</p>
              <h3 id="drink-makeup-title" className="text-2xl font-black text-slate-950">
                补记昨天水铺
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-600">
                给 {makeupEntry.dayKey} 补记 1 杯饮品。
              </p>
            </header>

            <div className="grid grid-cols-[70px_1fr] gap-3 rounded-[8px] border-2 border-slate-200 bg-white p-4 text-sm">
              <span className="font-black text-slate-500">饮品</span>
              <select
                aria-label="选择补记饮品"
                className="rounded-[8px] border-2 border-slate-950 bg-white px-3 py-2 font-black"
                value={makeupEntry.drinkType}
                onChange={(event) =>
                  setMakeupEntry((current) =>
                    current ? { ...current, drinkType: event.target.value as DrinkType } : current,
                  )
                }
              >
                {drinkItems.map((drink) => (
                  <option key={drink.type} value={drink.type}>
                    {drink.label}
                  </option>
                ))}
              </select>
              <span className="font-black text-slate-500">日期</span>
              <strong>{makeupEntry.dayKey}</strong>
              <span className="font-black text-slate-500">杯数</span>
              <strong>1 杯</strong>
            </div>

            <div className="my-4 grid grid-cols-[80px_1fr] items-center gap-4 rounded-[8px] border-4 border-slate-950 bg-white p-3">
              <img src={selectedDrink.asset} alt="" className="h-20 w-20 object-contain" />
              <strong className="text-2xl font-black text-slate-950">{selectedDrink.label}</strong>
            </div>

            <label className="block">
              <span className="text-sm font-black text-slate-700">心情/备注</span>
              <textarea
                className="mt-2 w-full resize-none rounded-[8px] border-2 border-slate-950 bg-white p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-200"
                name="drink-makeup-note"
                onChange={(event) =>
                  setMakeupEntry((current) =>
                    current ? { ...current, note: event.target.value } : current,
                  )
                }
                rows={3}
                value={makeupEntry.note}
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2" aria-label="补记备注候选">
              {drinkNoteOptions.map((note) => (
                <button
                  className="rounded-full border-2 border-slate-200 bg-white px-3 py-1 text-xs font-bold"
                  key={note}
                  onClick={() =>
                    setMakeupEntry((current) => (current ? { ...current, note } : current))
                  }
                  type="button"
                >
                  {note}
                </button>
              ))}
            </div>

            {error ? <p className="mt-3 text-sm font-bold text-orange-700">{error}</p> : null}

            <footer className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-[8px] border-2 border-slate-950 bg-white px-4 py-2 text-sm font-black"
                onClick={() => setMakeupEntry(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="rounded-[8px] border-2 border-slate-950 bg-yellow-200 px-5 py-2 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,0.4)] disabled:cursor-wait disabled:opacity-60"
                disabled={busy}
                onClick={() => void confirmMakeup()}
                type="button"
              >
                {busy ? "补记中..." : "确认补记"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
