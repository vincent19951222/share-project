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

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "short",
  timeZone: "Asia/Shanghai",
});

function getCoffeeDateLabel(day: number, today: number) {
  const now = new Date();
  const date = new Date(now);
  date.setDate(now.getDate() + (day - today));

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateNumber = String(date.getDate()).padStart(2, "0");

  return {
    date: `${month}-${dateNumber}`,
    weekday: day === today ? "今天" : weekdayFormatter.format(date),
  };
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
    return (
      <div className="coffee-calendar-cell coffee-calendar-cell-future">
        <span aria-hidden="true">-</span>
      </div>
    );
  }

  if (isTodayForCurrentUser) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onOpenActions}
        aria-label={cups === 0 ? "确认今天咖啡打卡" : "调整今天咖啡杯数"}
        className={`coffee-calendar-cell coffee-calendar-cell-today-user disabled:cursor-wait disabled:opacity-60 ${
          cups === 0 ? "coffee-calendar-cell-empty-today" : "coffee-calendar-cell-filled-today"
        }`}
      >
        {cups === 0 ? <span className="coffee-cell-plus">+</span> : <CoffeeCupIcon cups={cups} />}
        <span className="coffee-cell-today-caption">
          {cups === 0 ? "今天还没续命" : `今天已续命 ${cups} 杯`}
        </span>
      </button>
    );
  }

  if (cups > 0) {
    return (
      <div className="coffee-calendar-cell coffee-calendar-cell-filled">
        <CoffeeCupIcon cups={cups} />
      </div>
    );
  }

  return <div className="coffee-calendar-cell coffee-calendar-cell-empty" />;
}

export function CoffeeGrid({ snapshot, busy, onAddCup, onRemoveCup }: CoffeeGridProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const desktopTodayColumnRef = useRef<HTMLDivElement | null>(null);
  const mobileTodayColumnRef = useRef<HTMLDivElement | null>(null);
  const currentUserRowIndex = snapshot.members.findIndex(
    (member) => member.id === snapshot.currentUserId,
  );
  const currentUserTodayCups = snapshot.stats.currentUserTodayCups;

  useEffect(() => {
    desktopTodayColumnRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    mobileTodayColumnRef.current?.scrollIntoView?.({
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
    <>
    <section className="coffee-grid-desktop-shell coffee-calendar-paper">
      <header className="coffee-calendar-header">
        <div>
          <div className="coffee-calendar-eyebrow">Team Coffee Calendar</div>
          <h2 className="coffee-calendar-title">团队续命月历</h2>
        </div>
        <div className="coffee-calendar-header-icon" aria-hidden="true">
          <AssetIcon name="coffee" className="h-10 w-10 object-contain" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="coffee-member-rail flex w-28 shrink-0 flex-col">
          <div className="coffee-member-heading flex items-center justify-center border-b-[3px] border-orange-100 text-xs font-black text-amber-700">
            MEMBERS
          </div>
          <div className="coffee-member-list flex flex-1 flex-col justify-between">
            {snapshot.members.map((member) => (
              <div key={member.id} className="coffee-member-row flex min-w-0 items-center gap-2">
                <img
                  src={getAvatarUrl(member.avatarKey)}
                  alt={member.name}
                  className="coffee-member-avatar shrink-0 rounded-full border-2 border-slate-900 bg-white object-cover"
                />
                <span className="min-w-0 truncate text-xs font-black text-amber-950">
                  {member.name}
                </span>
                {member.id === snapshot.currentUserId ? (
                  <span className="coffee-current-user-badge">我</span>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-auto overflow-y-hidden scroll-smooth">
          <div className="coffee-days-header flex w-max shrink-0 border-b-[3px] border-orange-100 bg-orange-50">
            {Array.from({ length: snapshot.totalDays }, (_, index) => {
              const day = index + 1;
              const label = getCoffeeDateLabel(day, snapshot.today);
              return (
                <div
                  key={day}
                  ref={day === snapshot.today ? desktopTodayColumnRef : undefined}
                  className={`coffee-day-heading ${day === snapshot.today ? "coffee-day-column-today" : ""}`}
                >
                  <span>{label.date}</span>
                  <span>{label.weekday}</span>
                </div>
              );
            })}
          </div>
          <div className="coffee-grid-body flex w-max flex-1 flex-col justify-between">
            {snapshot.members.map((member, rowIndex) => (
              <div key={member.id} className="coffee-calendar-row flex items-center">
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

    </section>

    <section className="coffee-grid-mobile-shell coffee-calendar-paper coffee-calendar-paper-mobile">
      <header className="coffee-calendar-header">
        <div>
          <div className="coffee-calendar-eyebrow">Team Coffee Calendar</div>
          <h2 className="coffee-calendar-title">团队续命月历</h2>
        </div>
        <div className="coffee-calendar-header-icon" aria-hidden="true">
          <AssetIcon name="coffee" className="h-10 w-10 object-contain" />
        </div>
      </header>

      <div className="coffee-grid-mobile-scroll min-h-0 flex-1 overflow-auto scroll-smooth">
        <div className="coffee-grid-mobile-table w-max">
          <div className="coffee-grid-mobile-header flex items-center">
            <div className="coffee-grid-mobile-member-head sticky left-0 z-20 flex items-center justify-center border-r-[3px] border-orange-100 bg-orange-50 text-xs font-black text-amber-700">
              MEMBERS
            </div>
            {Array.from({ length: snapshot.totalDays }, (_, index) => {
              const day = index + 1;
              const label = getCoffeeDateLabel(day, snapshot.today);
              return (
                <div
                  key={day}
                  ref={day === snapshot.today ? mobileTodayColumnRef : undefined}
                  className={`coffee-grid-mobile-day coffee-day-heading ${day === snapshot.today ? "coffee-day-column-today" : ""}`}
                >
                  <span>{label.date}</span>
                  <span>{label.weekday}</span>
                </div>
              );
            })}
          </div>
          {snapshot.members.map((member, rowIndex) => (
            <div key={member.id} className="coffee-grid-mobile-row flex items-center">
              <div className="coffee-grid-mobile-member sticky left-0 z-10 flex items-center gap-2 border-r-[3px] border-orange-100 bg-white">
                <img
                  src={getAvatarUrl(member.avatarKey)}
                  alt={member.name}
                  className="coffee-grid-mobile-avatar shrink-0 rounded-full border-2 border-slate-900 bg-white object-cover"
                />
                <span className="coffee-grid-mobile-name min-w-0 truncate font-black text-amber-950">
                  {member.name}
                </span>
                {member.id === snapshot.currentUserId ? (
                  <span className="coffee-current-user-badge">我</span>
                ) : null}
              </div>
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
    </section>

    {actionsOpen ? (
        <div
          className="coffee-dialog-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/25 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coffee-calendar-dialog-title"
        >
          <div className="coffee-dialog-ticket">
            <div className="coffee-dialog-eyebrow">Today Coffee</div>
            <h3
              id="coffee-calendar-dialog-title"
              className="coffee-dialog-title"
            >
              {currentUserTodayCups === 0 ? "确认今天喝咖啡？" : "调整今天的杯数"}
            </h3>
            <p className="coffee-dialog-description">
              {currentUserTodayCups === 0
                ? "确认后会先记录为 1 杯，后面如果继续喝，可以再从这里加。"
                : `当前记录 ${currentUserTodayCups} 杯，可以继续 +1，也可以撤回最新一杯。`}
            </p>
            <div className="coffee-dialog-actions">
              <button
                type="button"
                onClick={() => setActionsOpen(false)}
                className="bg-white"
              >
                取消
              </button>
              {currentUserTodayCups > 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAndClose(onRemoveCup)}
                  className="bg-orange-200 disabled:cursor-wait disabled:opacity-60"
                >
                  -1 杯
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => runAndClose(onAddCup)}
                className="bg-teal-200 disabled:cursor-wait disabled:opacity-60"
              >
                {currentUserTodayCups === 0 ? "确认 1 杯" : "+1 杯"}
              </button>
            </div>
          </div>
        </div>
    ) : null}
    </>
  );
}
