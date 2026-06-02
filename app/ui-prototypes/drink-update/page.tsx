"use client";

import { useMemo, useState } from "react";
import { buildDrinkEvent, drinkNoteOptions, pickDrinkNote, type DrinkEvent, type DrinkId } from "./drink-entry";
import styles from "./DrinkUpdatePrototype.module.css";

type Drink = {
  id: DrinkId;
  label: string;
  asset: string;
  color: string;
  softColor: string;
  textColor: string;
  unit: string;
};

type TeamMember = {
  name: string;
  avatar: string;
  today: number;
  drinks: DrinkId[];
  days: number[];
};

const drinks: Drink[] = [
  {
    id: "water",
    label: "水",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-water.png",
    color: "#4fb8d6",
    softColor: "#e8f8fc",
    textColor: "#0087a6",
    unit: "杯",
  },
  {
    id: "milkTea",
    label: "奶茶",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-milk-tea.png",
    color: "#ef7f8f",
    softColor: "#fff1ee",
    textColor: "#e96f83",
    unit: "杯",
  },
  {
    id: "americano",
    label: "美式",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-americano.png",
    color: "#7a5438",
    softColor: "#fff3df",
    textColor: "#76411f",
    unit: "杯",
  },
  {
    id: "latte",
    label: "拿铁",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-latte.png",
    color: "#ef9d36",
    softColor: "#fff4dd",
    textColor: "#e4841b",
    unit: "杯",
  },
  {
    id: "other",
    label: "其他",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-other.png",
    color: "#8f948e",
    softColor: "#f4f3ed",
    textColor: "#555555",
    unit: "杯",
  },
];

const initialEvents: DrinkEvent[] = [
  { id: 1, drinkId: "water", time: "08:42", note: "早起一杯，清醒一下！" },
  { id: 2, drinkId: "water", time: "09:30", note: "把水杯放回视线里" },
  { id: 3, drinkId: "americano", time: "10:15", note: "加油干！" },
  { id: 4, drinkId: "milkTea", time: "14:03", note: "奶茶续命，快乐加倍～" },
  { id: 5, drinkId: "americano", time: "14:40", note: "会议前补一口" },
  { id: 6, drinkId: "water", time: "15:02", note: "少冰少内耗" },
  { id: 7, drinkId: "latte", time: "15:18", note: "下午用奶泡顶住" },
];

const navItems = [
  { label: "健身打卡", icon: "⌁" },
  { label: "共享看板", icon: "▪" },
  { label: "续命咖啡", icon: "☕" },
  { label: "牛马日历", icon: "▣" },
  { label: "战报中心", icon: "◫" },
  { label: "牛马水铺", icon: "☕" },
];

const teamMembers: TeamMember[] = [
  {
    name: "li",
    avatar: "/avatars/male1.png",
    today: 2,
    drinks: ["water", "latte"],
    days: [2, 1, 0, 3, 2, 1, 2],
  },
  {
    name: "luo",
    avatar: "/avatars/male2.png",
    today: 3,
    drinks: ["water", "water", "americano"],
    days: [3, 2, 1, 2, 4, 2, 3],
  },
  {
    name: "shadow",
    avatar: "/avatars/female1.png",
    today: 1,
    drinks: ["milkTea"],
    days: [1, 0, 2, 1, 1, 2, 1],
  },
  {
    name: "wu",
    avatar: "/avatars/male3.png",
    today: 2,
    drinks: ["water", "americano"],
    days: [2, 2, 1, 0, 2, 3, 2],
  },
  {
    name: "最美的牛马",
    avatar: "/avatars/female2.png",
    today: 1,
    drinks: ["water"],
    days: [1, 1, 2, 1, 0, 2, 1],
  },
];

const calendarDays = ["06-01 今天", "06-02 周二", "06-03 周三", "06-04 周四", "06-05 周五", "06-06 周六", "06-07 周日"];

const quickNotes = [
  "喝够 8 杯水",
  "少喝奶茶",
  "早点起床",
];

function getCurrentTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}

function drinkById(drinkId: DrinkId) {
  return drinks.find((drink) => drink.id === drinkId) ?? drinks[0];
}

function countEvents(events: DrinkEvent[]) {
  return drinks.reduce<Record<DrinkId, number>>(
    (counts, drink) => ({
      ...counts,
      [drink.id]: events.filter((event) => event.drinkId === drink.id).length,
    }),
    {
      water: 0,
      milkTea: 0,
      americano: 0,
      latte: 0,
      other: 0,
    },
  );
}

function DrinkMiniIcon({ drink, tiny = false }: { drink: Drink; tiny?: boolean }) {
  return (
    <span
      className={`${styles.drinkMiniIcon} ${tiny ? styles.drinkMiniIconTiny : ""}`}
      style={
        {
          "--drink-color": drink.color,
          "--drink-soft": drink.softColor,
          "--drink-text": drink.textColor,
        } as React.CSSProperties
      }
      title={drink.label}
    >
      <img src={drink.asset} alt="" />
    </span>
  );
}

function ResourcePill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <span className={styles.resourcePill} aria-label={`${label} ${value}`}>
      <img src={icon} alt="" />
      <strong>{value}</strong>
    </span>
  );
}

export default function DrinkUpdatePrototypePage() {
  const [events, setEvents] = useState<DrinkEvent[]>(initialEvents);
  const [pendingEntry, setPendingEntry] = useState<{
    drinkId: DrinkId;
    time: string;
    note: string;
  } | null>(null);

  const counts = useMemo(() => countEvents(events), [events]);
  const totalCount = events.length;
  const latestEvent = events[events.length - 1] ?? null;
  const visibleEvents = events.slice(-5).reverse();
  const pendingDrink = pendingEntry ? drinkById(pendingEntry.drinkId) : null;
  const latestDrink = latestEvent ? drinkById(latestEvent.drinkId) : null;
  const dailyGoal = 8;
  const remainingCups = Math.max(dailyGoal - totalCount, 0);
  const favoriteDrink = drinks
    .map((drink) => ({ drink, count: counts[drink.id] }))
    .sort((left, right) => right.count - left.count || drinks.indexOf(left.drink) - drinks.indexOf(right.drink))[0];

  function openDrinkConfirmation(drinkId: DrinkId) {
    setPendingEntry({
      drinkId,
      time: getCurrentTime(),
      note: pickDrinkNote(),
    });
  }

  function confirmDrink() {
    if (!pendingEntry) {
      return;
    }

    setEvents((current) => [
      ...current,
      buildDrinkEvent({
        id: Date.now(),
        drinkId: pendingEntry.drinkId,
        time: pendingEntry.time,
        note: pendingEntry.note,
      }),
    ]);
    setPendingEntry(null);
  }

  function removeDrink(drinkId: DrinkId) {
    setEvents((current) => {
      const index = current.findLastIndex((event) => event.drinkId === drinkId);

      if (index < 0) {
        return current;
      }

      return current.filter((_, eventIndex) => eventIndex !== index);
    });
  }

  return (
    <main className={styles.prototype}>
      <section className={styles.shell} aria-label="牛马水铺原型">
        <nav className={styles.topNav} aria-label="脱脂牛马主导航">
          <a className={styles.brand} href="/drink" aria-label="脱脂牛马">
            <span className={styles.brandIcon}>
              <img src="/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png" alt="" />
            </span>
            <span>牛马水铺</span>
          </a>

          <div className={styles.navTabs} aria-label="主站栏目">
            {navItems.map((item) => (
              <a
                aria-current={item.label === "牛马水铺" ? "page" : undefined}
                className={item.label === "牛马水铺" ? styles.navTabActive : styles.navTab}
                href={item.label === "牛马水铺" ? "/ui-prototypes/drink-update" : "#"}
                key={item.label}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>

          <div className={styles.navTools} aria-label="个人入口">
            <button type="button" aria-label="菜单" className={styles.circleTool}>
              <span />
              <span />
              <span />
            </button>
            <button type="button" aria-label="通知" className={`${styles.circleTool} ${styles.bellTool}`}>
              ♧
              <span aria-hidden="true">1</span>
            </button>
            <ResourcePill icon="/assets/home-scenes/supply/shared/supply-resource-coins.png" label="银子" value="960" />
            <ResourcePill icon="/assets/home-scenes/supply/shared/supply-resource-ticket.png" label="券" value="1" />
            <ResourcePill icon="/assets/home-scenes/supply/shared/supply-resource-backpack.png" label="背包" value="10/60" />
            <button type="button" aria-label="li 的用户菜单" className={styles.avatarButton}>
              <img src="/avatars/male1.png" alt="" />
            </button>
          </div>
        </nav>

        <div className={styles.stage}>
          <img className={`${styles.floatAsset} ${styles.noCoffeeNote}`} src="/assets/home-scenes/coffee/note-no-coffee-no-gain.webp" alt="" />
          <img className={`${styles.floatAsset} ${styles.coffeeCup}`} src="/assets/home-scenes/coffee/takeaway-cup.webp" alt="" />
          <img className={`${styles.floatAsset} ${styles.beans}`} src="/assets/home-scenes/coffee/coffee-beans.webp" alt="" />

          <aside className={`${styles.paperProp} ${styles.receiptProp}`} aria-hidden="true">
            <strong>牛马水铺小票</strong>
            <span>今日状态</span>
            <span>续命中 ☕</span>
            <span>记得多喝水</span>
            <span>别当码马！</span>
            <i />
          </aside>

          <aside className={`${styles.paperProp} ${styles.yellowProp}`} aria-hidden="true">
            <span>多喝水</span>
            <span>少内耗！</span>
            <b>⌣</b>
          </aside>

          <aside className={`${styles.paperProp} ${styles.goalProp}`} aria-hidden="true">
            <strong>今日小目标</strong>
            {quickNotes.map((note, index) => (
              <span key={note}>{index === 0 ? "☑" : "☐"} {note}</span>
            ))}
          </aside>

          <header className={styles.pageTitle} aria-labelledby="drink-prototype-title">
            <span aria-hidden="true" className={styles.sparkles}>✦</span>
            <h1 id="drink-prototype-title">今天喝点什么</h1>
            <span aria-hidden="true" className={styles.titleArrow}>↘</span>
          </header>

          <section className={styles.receiptWorkbench} aria-label="今日水铺小票">
            <div className={styles.receiptMain}>
              <header className={styles.receiptHeader}>
                <div className={styles.ticketTitle}>
                  <span aria-hidden="true" className={styles.receiptIcon}>▤</span>
                  <h2>今日水铺小票</h2>
                </div>
              </header>

              <div className={styles.drinkTickets} aria-label="饮品加减">
                {drinks.map((drink) => {
                  const count = counts[drink.id];

                  return (
                    <article
                      className={styles.drinkTicket}
                      key={drink.id}
                      style={
                        {
                          "--drink-color": drink.color,
                          "--drink-soft": drink.softColor,
                          "--drink-text": drink.textColor,
                        } as React.CSSProperties
                      }
                    >
                      <h3>{drink.label}</h3>
                      <div className={styles.drinkIllustration}>
                        <img src={drink.asset} alt="" />
                      </div>
                      <span className={styles.countBubble}>x{count}</span>
                      <div className={styles.ticketStepper}>
                        <button
                          type="button"
                          aria-label={`减少一${drink.unit}${drink.label}`}
                          disabled={count === 0}
                          onClick={() => removeDrink(drink.id)}
                        >
                          -
                        </button>
                        <strong aria-label={`${drink.label}今日${count}${drink.unit}`}>{count}</strong>
                        <button type="button" aria-label={`增加一${drink.unit}${drink.label}`} onClick={() => openDrinkConfirmation(drink.id)}>
                          +
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className={styles.todayDrank} aria-label="今日饮品贴纸">
                <strong>今日喝了</strong>
                <div>
                  {events.map((event) => (
                    <DrinkMiniIcon drink={drinkById(event.drinkId)} key={event.id} />
                  ))}
                  <button type="button" className={styles.addDashed} onClick={() => openDrinkConfirmation("water")} aria-label="快速记录一杯水">
                    +
                  </button>
                </div>
              </div>
            </div>

            <aside className={styles.receiptStats} aria-label="今日饮品摘要">
              <header className={styles.statsHeader}>
                <span>今日状态</span>
                <strong>水铺营业中</strong>
              </header>

              <section className={styles.statsHero} aria-label={`今日总杯数 ${totalCount}`}>
                <span>今日总杯数</span>
                <strong>{totalCount}</strong>
                <div className={styles.goalTally} aria-label={`8 杯目标，已完成 ${Math.min(totalCount, dailyGoal)} 杯`}>
                  {Array.from({ length: dailyGoal }).map((_, index) => (
                    <i className={index < totalCount ? styles.tallyDotFilled : styles.tallyDot} key={index} />
                  ))}
                </div>
              </section>

              <section className={styles.latestSticker} aria-label="最近一杯">
                <span className={styles.statsLabel}>最近一杯</span>
                {latestDrink && latestEvent ? (
                  <>
                    <DrinkMiniIcon drink={latestDrink} tiny />
                    <div className={styles.latestMeta}>
                      <strong>{latestDrink.label}</strong>
                      <time>{latestEvent.time}</time>
                    </div>
                    <p>{latestEvent.note}</p>
                  </>
                ) : (
                  <strong>暂无记录</strong>
                )}
              </section>

              <section className={styles.miniLeaderboard} aria-label="饮品小排行">
                <span className={styles.statsLabel}>饮品小排行</span>
                {drinks
                  .map((drink) => ({ drink, count: counts[drink.id] }))
                  .filter((item) => item.count > 0)
                  .sort((left, right) => right.count - left.count)
                  .slice(0, 3)
                  .map((item, index) => (
                    <div className={styles.leaderRow} key={item.drink.id}>
                      <span>{index + 1}</span>
                      <DrinkMiniIcon drink={item.drink} tiny />
                      <strong>{item.drink.label}</strong>
                      <em>x{item.count}</em>
                    </div>
                  ))}
              </section>

              <footer className={styles.stateTape}>
                <span>{remainingCups > 0 ? `距离 8 杯还差 ${remainingCups} 杯` : "今日水铺目标达成"}</span>
              </footer>
            </aside>
          </section>

          <section className={styles.logTable} aria-label="今日饮品流水">
            <header>
              <div className={styles.ticketTitle}>
                <span aria-hidden="true" className={styles.receiptIcon}>▤</span>
                <h2>今日饮品流水</h2>
              </div>
              <button type="button" onClick={() => openDrinkConfirmation("water")}>+ 记录一杯</button>
            </header>

            <div className={styles.logGrid} role="table" aria-label="今日饮品流水表">
              <div className={styles.logHead} role="row">
                <span role="columnheader">时间</span>
                <span role="columnheader">饮品</span>
                <span role="columnheader">杯数</span>
                <span role="columnheader">心情/备注</span>
                <span role="columnheader" aria-label="表情" />
              </div>
              {visibleEvents.map((event) => {
                const drink = drinkById(event.drinkId);

                return (
                  <div className={styles.logRow} role="row" key={event.id}>
                    <time role="cell">{event.time}</time>
                    <span role="cell">
                      <DrinkMiniIcon drink={drink} tiny />
                      <strong>{drink.label}</strong>
                    </span>
                    <span role="cell">1 杯</span>
                    <span role="cell">{event.note}</span>
                    <span role="cell" aria-label="开心">☺</span>
                  </div>
                );
              })}
            </div>
          </section>

          {pendingEntry && pendingDrink ? (
            <div className={styles.entryModalBackdrop} role="presentation">
              <section
                aria-labelledby="drink-entry-title"
                aria-modal="true"
                className={styles.entryModal}
                role="dialog"
              >
                <header>
                  <span aria-hidden="true" className={styles.entryModalIcon}>▤</span>
                  <div>
                    <p>牛马水铺入账</p>
                    <h2 id="drink-entry-title">确认记录一杯</h2>
                  </div>
                </header>

                <div className={styles.entrySummary}>
                  <span>时间</span>
                  <strong>{pendingEntry.time}</strong>
                  <span>饮品</span>
                  <label>
                    <select
                      aria-label="选择饮品"
                      value={pendingEntry.drinkId}
                      onChange={(event) =>
                        setPendingEntry((current) =>
                          current ? { ...current, drinkId: event.target.value as DrinkId } : current,
                        )
                      }
                    >
                      {drinks.map((drink) => (
                        <option key={drink.id} value={drink.id}>
                          {drink.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>杯数</span>
                  <strong>1 杯</strong>
                </div>

                <div
                  className={styles.entryDrinkPreview}
                  style={
                    {
                      "--drink-color": pendingDrink.color,
                      "--drink-soft": pendingDrink.softColor,
                      "--drink-text": pendingDrink.textColor,
                    } as React.CSSProperties
                  }
                >
                  <img src={pendingDrink.asset} alt="" />
                  <strong>{pendingDrink.label}</strong>
                </div>

                <label className={styles.entryNoteField}>
                  <span>心情/备注</span>
                  <textarea
                    name="drink-note"
                    rows={3}
                    value={pendingEntry.note}
                    onChange={(event) =>
                      setPendingEntry((current) =>
                        current ? { ...current, note: event.target.value } : current,
                      )
                    }
                  />
                </label>

                <div className={styles.entryNoteOptions} aria-label="备注候选">
                  {drinkNoteOptions.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() =>
                        setPendingEntry((current) => (current ? { ...current, note } : current))
                      }
                    >
                      {note}
                    </button>
                  ))}
                </div>

                <footer>
                  <button type="button" onClick={() => setPendingEntry(null)}>
                    取消
                  </button>
                  <button type="button" onClick={confirmDrink}>
                    确认入账
                  </button>
                </footer>
              </section>
            </div>
          ) : null}

          <section className={styles.teamPanel} aria-label="团队喝水打卡">
            <header>
              <div className={styles.teamTitle}>
                <span aria-hidden="true">☕</span>
                <h2>团队喝水打卡</h2>
                <small>低优先级</small>
              </div>
              <span className={styles.tapeLabel}>团队看板</span>
            </header>

            <div className={styles.memberCards} aria-label="成员今日概览">
              {teamMembers.map((member) => (
                <article className={styles.memberCard} key={member.name}>
                  <img src={member.avatar} alt="" />
                  <div>
                    <strong>{member.name}</strong>
                    <span>今日 {member.today} 杯</span>
                  </div>
                  <div className={styles.memberBars} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              ))}

              <button type="button" className={styles.inviteCard}>
                <span aria-hidden="true">♟</span>
                邀请同事
              </button>
            </div>

            <div className={styles.teamCalendar} role="table" aria-label="团队饮品月历">
              <div className={styles.calendarHeader} role="row">
                <span role="columnheader">成员</span>
                {calendarDays.map((day) => (
                  <span role="columnheader" key={day}>{day}</span>
                ))}
              </div>

              {teamMembers.map((member) => (
                <div className={styles.calendarRow} role="row" key={`${member.name}-calendar`}>
                  <span role="rowheader">
                    <img src={member.avatar} alt="" />
                    {member.name}
                  </span>
                  {member.days.map((dayTotal, index) => (
                    <span className={dayTotal > 0 ? styles.calendarCellFilled : styles.calendarCell} role="cell" key={`${member.name}-${index}`}>
                      {dayTotal > 0 ? dayTotal : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
