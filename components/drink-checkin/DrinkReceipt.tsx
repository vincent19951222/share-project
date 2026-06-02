"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { drinkItems } from "./drink-catalog";
import { drinkNoteOptions, getCurrentDrinkEntryTime, pickDrinkNote } from "./drink-entry";
import type { DrinkType } from "@/lib/drinks";
import type { DrinkSnapshot } from "@/lib/types";

interface DrinkReceiptProps {
  snapshot: DrinkSnapshot;
  busy: boolean;
  error: string | null;
  onConfirmDrink: (input: { drinkType: DrinkType; note?: string | null }) => Promise<void>;
  onRemoveDrink: (drinkType?: DrinkType) => Promise<void>;
}

interface PendingEntry {
  drinkType: DrinkType;
  time: string;
  note: string;
}

function drinkStyle(drink: (typeof drinkItems)[number]) {
  return {
    "--drink-color": drink.color,
    "--drink-soft": drink.softColor,
    "--drink-text": drink.textColor,
  } as CSSProperties;
}

function DrinkMiniIcon({
  drinkType,
  tiny = false,
}: {
  drinkType: DrinkType;
  tiny?: boolean;
}) {
  const drink = drinkItems.find((item) => item.type === drinkType) ?? drinkItems[0];

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-slate-950 bg-white ${
        tiny ? "h-9 w-9" : "h-11 w-11"
      }`}
      style={{ background: drink.softColor }}
      title={drink.label}
    >
      <img src={drink.asset} alt="" className={tiny ? "h-7 w-7 object-contain" : "h-9 w-9 object-contain"} />
    </span>
  );
}

export function DrinkReceipt({
  snapshot,
  busy,
  error,
  onConfirmDrink,
  onRemoveDrink,
}: DrinkReceiptProps) {
  const [pendingEntry, setPendingEntry] = useState<PendingEntry | null>(null);

  const visibleEvents = snapshot.todayEvents.slice(-5).reverse();
  const latestDrink = snapshot.stats.latestDrink;
  const dailyGoal = 8;
  const totalCount = snapshot.stats.currentUserTodayCups;
  const remainingCups = Math.max(dailyGoal - totalCount, 0);
  const favoriteRows = useMemo(
    () =>
      drinkItems
        .map((drink) => ({ drink, count: snapshot.stats.drinkCounts[drink.type] }))
        .filter((item) => item.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 3),
    [snapshot.stats.drinkCounts],
  );
  const pendingDrink = pendingEntry
    ? drinkItems.find((drink) => drink.type === pendingEntry.drinkType) ?? drinkItems[0]
    : null;

  function updatePendingNote(note: string) {
    setPendingEntry((current) => (current ? { ...current, note } : current));
  }

  function openDrinkConfirmation(drinkType: DrinkType) {
    setPendingEntry({
      drinkType,
      time: getCurrentDrinkEntryTime(),
      note: pickDrinkNote(),
    });
  }

  async function confirmDrink() {
    if (!pendingEntry) {
      return;
    }

    await onConfirmDrink({
      drinkType: pendingEntry.drinkType,
      note: pendingEntry.note,
    });
    setPendingEntry(null);
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" aria-label="今日水铺小票">
        <div className="rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[8px_8px_0_rgba(15,23,42,0.28)]">
          <header className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-cyan-700">Niuma Water Shop</p>
              <h1 className="text-3xl font-black leading-none text-slate-950">今日水铺小票</h1>
            </div>
            <button
              type="button"
              className="rounded-full border-2 border-slate-950 bg-yellow-200 px-4 py-2 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,0.4)] disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={() => openDrinkConfirmation("water")}
            >
              + 记录一杯
            </button>
          </header>

          <div className="grid gap-4 md:grid-cols-5">
            {drinkItems.map((drink) => {
              const count = snapshot.stats.drinkCounts[drink.type];

              return (
                <article
                  className="relative rounded-[8px] border-4 border-slate-950 bg-white p-3 shadow-[5px_5px_0_rgba(15,23,42,0.18)]"
                  key={drink.type}
                  style={drinkStyle(drink)}
                >
                  <h2 className="text-lg font-black text-slate-950">{drink.label}</h2>
                  <div className="my-3 grid aspect-square place-items-center rounded-[8px] border-2 border-slate-200 bg-[var(--drink-soft)]">
                    <img src={drink.asset} alt="" className="h-[76%] w-[76%] object-contain" />
                  </div>
                  <span className="absolute right-2 top-2 rounded-full border-2 border-slate-950 bg-white px-2 py-1 text-xs font-black">
                    x{count}
                  </span>
                  <div className="grid grid-cols-[38px_1fr_38px] items-center gap-2">
                    <button
                      type="button"
                      aria-label={`减少一杯${drink.label}`}
                      disabled={busy || count === 0}
                      onClick={() => void onRemoveDrink(drink.type)}
                      className="grid h-9 place-items-center rounded-full border-2 border-slate-950 bg-slate-100 text-lg font-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      -
                    </button>
                    <strong className="text-center text-lg font-black" aria-label={`${drink.label}今日${count}杯`}>
                      {count}
                    </strong>
                    <button
                      type="button"
                      aria-label={`增加一杯${drink.label}`}
                      disabled={busy}
                      onClick={() => openDrinkConfirmation(drink.type)}
                      className="grid h-9 place-items-center rounded-full border-2 border-slate-950 bg-yellow-200 text-lg font-black shadow-[2px_2px_0_rgba(15,23,42,0.45)] disabled:cursor-wait disabled:opacity-60"
                    >
                      +
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 rounded-[8px] border-2 border-dashed border-slate-300 bg-white/80 p-4">
            <strong className="text-sm font-black text-slate-600">今日喝了</strong>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {snapshot.todayEvents
                .filter((event) => event.userId === snapshot.currentUserId)
                .map((event) => (
                  <DrinkMiniIcon drinkType={event.drinkType} key={event.id} />
                ))}
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-slate-400 bg-white text-lg font-black"
                onClick={() => openDrinkConfirmation("water")}
                aria-label="快速记录一杯水"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-[8px] border-4 border-slate-950 bg-cyan-50 p-5 shadow-[8px_8px_0_rgba(15,23,42,0.22)]">
          <header className="mb-4">
            <span className="text-xs font-black uppercase text-cyan-700">今日状态</span>
            <h2 className="text-2xl font-black text-slate-950">水铺营业中</h2>
          </header>

          <section className="rounded-[8px] border-4 border-slate-950 bg-white p-4">
            <span className="text-xs font-black text-slate-500">我的今日杯数</span>
            <strong className="block text-6xl font-black leading-none text-slate-950">{totalCount}</strong>
            <div className="mt-3 grid grid-cols-8 gap-1" aria-label={`8 杯目标，已完成 ${Math.min(totalCount, dailyGoal)} 杯`}>
              {Array.from({ length: dailyGoal }).map((_, index) => (
                <i
                  className={`h-3 rounded-full border border-slate-950 ${
                    index < totalCount ? "bg-cyan-400" : "bg-white"
                  }`}
                  key={index}
                />
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-[8px] border-2 border-slate-950 bg-white p-4">
            <span className="text-xs font-black text-slate-500">最近一杯</span>
            {latestDrink ? (
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-3">
                <DrinkMiniIcon drinkType={latestDrink.drinkType} tiny />
                <div>
                  <strong className="block text-sm font-black">
                    {drinkItems.find((drink) => drink.type === latestDrink.drinkType)?.label}
                  </strong>
                  <time className="text-xs font-bold text-slate-500">{latestDrink.time}</time>
                  <p className="mt-1 text-xs font-bold text-slate-600">{latestDrink.note ?? "无备注"}</p>
                </div>
              </div>
            ) : (
              <strong className="mt-2 block text-sm font-black">暂无记录</strong>
            )}
          </section>

          <section className="mt-4 space-y-2 rounded-[8px] border-2 border-slate-950 bg-white p-4">
            <span className="text-xs font-black text-slate-500">饮品小排行</span>
            {favoriteRows.length === 0 ? <p className="text-xs font-bold text-slate-500">今天还没开张</p> : null}
            {favoriteRows.map((item, index) => (
              <div className="grid grid-cols-[20px_auto_1fr_auto] items-center gap-2" key={item.drink.type}>
                <span className="font-mono text-xs font-black">{index + 1}</span>
                <DrinkMiniIcon drinkType={item.drink.type} tiny />
                <strong className="text-sm font-black">{item.drink.label}</strong>
                <em className="text-xs font-black not-italic">x{item.count}</em>
              </div>
            ))}
          </section>

          <footer className="mt-4 rounded-full border-2 border-slate-950 bg-yellow-200 px-4 py-2 text-center text-sm font-black">
            {remainingCups > 0 ? `距离 8 杯还差 ${remainingCups} 杯` : "今日水铺目标达成"}
          </footer>

          {error ? <p className="mt-3 text-sm font-bold text-orange-700">{error}</p> : null}
        </aside>
      </section>

      <section className="rounded-[8px] border-4 border-slate-950 bg-white/95 p-5 shadow-[8px_8px_0_rgba(15,23,42,0.2)]">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950">今日饮品流水</h2>
          <button
            type="button"
            className="rounded-full border-2 border-slate-950 bg-yellow-200 px-4 py-2 text-sm font-black"
            onClick={() => openDrinkConfirmation("water")}
          >
            + 记录一杯
          </button>
        </header>

        <div className="grid gap-2">
          <div className="hidden grid-cols-[90px_1fr_70px_2fr_40px] gap-3 rounded-[8px] bg-slate-950 px-3 py-2 text-xs font-black text-white md:grid">
            <span>时间</span>
            <span>饮品</span>
            <span>杯数</span>
            <span>心情/备注</span>
            <span />
          </div>
          {visibleEvents.length === 0 ? (
            <div className="rounded-[8px] border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
              今日还没有饮品流水
            </div>
          ) : null}
          {visibleEvents.map((event) => {
            const drink = drinkItems.find((item) => item.type === event.drinkType) ?? drinkItems[0];

            return (
              <div
                className="grid gap-2 rounded-[8px] border-2 border-slate-200 bg-white px-3 py-3 text-sm font-bold md:grid-cols-[90px_1fr_70px_2fr_40px]"
                key={event.id}
              >
                <time>{event.time}</time>
                <span className="flex items-center gap-2">
                  <DrinkMiniIcon drinkType={drink.type} tiny />
                  <strong>{drink.label}</strong>
                </span>
                <span>1 杯</span>
                <span>{event.note ?? "无备注"}</span>
                <span aria-label="开心">☺</span>
              </div>
            );
          })}
        </div>
      </section>

      {pendingEntry && pendingDrink ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation">
          <section
            aria-labelledby="drink-entry-title"
            aria-modal="true"
            className="w-full max-w-[520px] rounded-[8px] border-4 border-slate-950 bg-[#fffdf7] p-5 shadow-[12px_12px_0_rgba(15,23,42,0.45)]"
            role="dialog"
          >
            <header className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[8px] border-2 border-slate-950 bg-yellow-200 text-xl font-black">
                ▤
              </span>
              <div>
                <p className="text-xs font-black uppercase text-cyan-700">牛马水铺入账</p>
                <h2 id="drink-entry-title" className="text-2xl font-black text-slate-950">
                  确认记录一杯
                </h2>
              </div>
            </header>

            <div className="grid grid-cols-[70px_1fr] gap-3 rounded-[8px] border-2 border-slate-200 bg-white p-4 text-sm">
              <span className="font-black text-slate-500">时间</span>
              <strong>{pendingEntry.time}</strong>
              <span className="font-black text-slate-500">饮品</span>
              <select
                aria-label="选择饮品"
                className="rounded-[8px] border-2 border-slate-950 bg-white px-3 py-2 font-black"
                value={pendingEntry.drinkType}
                onChange={(event) =>
                  setPendingEntry((current) =>
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
              <span className="font-black text-slate-500">杯数</span>
              <strong>1 杯</strong>
            </div>

            <div
              className="my-4 grid grid-cols-[96px_1fr] items-center gap-4 rounded-[8px] border-4 border-slate-950 bg-[var(--drink-soft)] p-3"
              style={drinkStyle(pendingDrink)}
            >
              <img src={pendingDrink.asset} alt="" className="h-24 w-24 object-contain" />
              <strong className="text-3xl font-black text-[var(--drink-text)]">{pendingDrink.label}</strong>
            </div>

            <label className="block">
              <span className="text-sm font-black text-slate-700">心情/备注</span>
              <textarea
                name="drink-note"
                rows={3}
                className="mt-2 w-full resize-none rounded-[8px] border-2 border-slate-950 bg-white p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-200"
                value={pendingEntry.note}
                onChange={(event) => updatePendingNote(event.target.value)}
                onInput={(event) => updatePendingNote(event.currentTarget.value)}
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2" aria-label="备注候选">
              {drinkNoteOptions.map((note) => (
                <button
                  key={note}
                  type="button"
                  className="rounded-full border-2 border-slate-200 bg-white px-3 py-1 text-xs font-bold"
                  onClick={() => setPendingEntry((current) => (current ? { ...current, note } : current))}
                >
                  {note}
                </button>
              ))}
            </div>

            <footer className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-[8px] border-2 border-slate-950 bg-white px-4 py-2 text-sm font-black"
                onClick={() => setPendingEntry(null)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-[8px] border-2 border-slate-950 bg-yellow-200 px-5 py-2 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,0.4)] disabled:cursor-wait disabled:opacity-60"
                onClick={() => void confirmDrink()}
              >
                确认入账
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
