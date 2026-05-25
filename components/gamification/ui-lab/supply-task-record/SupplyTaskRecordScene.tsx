"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyTaskRecordDateOption,
  SupplyTaskRecordDrawHistoryItem,
  SupplyTaskRecordFilter,
  SupplyTaskRecordInvite,
  SupplyTaskRecordMode,
  SupplyTaskRecordPreview,
  SupplyTaskRecordRadarStatus,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineItem,
} from "./types";

const timelineStatusTone: Record<SupplyTaskRecordTimelineItem["status"], "success" | "warning"> = {
  claimed: "warning",
  completed: "success",
};

const redemptionStatusTone: Record<SupplyTaskRecordRedemption["status"], "success" | "warning" | "muted"> = {
  completed: "success",
  expired: "muted",
  processing: "warning",
};

const radarStatusTone: Record<SupplyTaskRecordRadarStatus, "success" | "warning" | "muted"> = {
  expired: "muted",
  ignored: "muted",
  pending: "warning",
  responded: "success",
};

const modeTitles: Record<SupplyTaskRecordMode, string> = {
  draws: "抽卡记录",
  radar: "队友雷达",
  redemptions: "兑换记录",
  rules: "规则说明",
  today: "今日记录",
};

const timelineEventTypeByCategory: Record<SupplyTaskRecordTimelineItem["category"], string> = {
  draw: "draw",
  mainline: "task",
  reward: "reward",
  social: "social",
  system: "reward",
};

const timelineEventIconByType: Record<string, string> = {
  draw: "券",
  reward: "银",
  social: "友",
  task: "✓",
};

function filterTimelineRecords(
  records: SupplyTaskRecordTimelineItem[],
  filterId: SupplyTaskRecordFilter["id"],
) {
  if (filterId === "all") {
    return records;
  }

  if (filterId === "reward") {
    return records.filter((record) => record.category === "reward" || record.category === "draw");
  }

  return records.filter((record) => record.category === filterId);
}

function getMenuBadge(
  data: SupplyTaskRecordPreview,
  mode: SupplyTaskRecordMode,
  radarInvites: SupplyTaskRecordInvite[],
) {
  if (mode === "draws") {
    return String(data.drawHistory.length);
  }

  if (mode === "redemptions") {
    const activeRedemptions = data.redemptions.items.filter((item) => item.status === "processing").length;
    return activeRedemptions > 0 ? String(activeRedemptions) : null;
  }

  if (mode === "radar") {
    const pendingInvites = radarInvites.filter((invite) => invite.status === "pending").length;
    return pendingInvites > 0 ? String(pendingInvites) : null;
  }

  return null;
}

export function SupplyTaskRecordScene({ data }: { data: SupplyTaskRecordPreview }) {
  const [activeMode, setActiveMode] = useState<SupplyTaskRecordMode>(data.activeMode);
  const [activeDateKey, setActiveDateKey] = useState(data.activeDateKey);
  const [radarInvites, setRadarInvites] = useState(() => data.radar.invites);
  const [activeFilterId, setActiveFilterId] = useState<SupplyTaskRecordFilter["id"]>(
    data.filters.find((filter) => filter.active)?.id ?? "all",
  );
  const selectedDate = useMemo(
    () => data.dates.find((date) => date.key === activeDateKey) ?? data.dates[0],
    [activeDateKey, data.dates],
  );
  const selectedRecords = data.recordsByDate[activeDateKey] ?? [];
  const visibleRecords = useMemo(
    () => filterTimelineRecords(selectedRecords, activeFilterId),
    [activeFilterId, selectedRecords],
  );
  const filters = data.filters.map((filter) => ({
    ...filter,
    active: filter.id === activeFilterId,
  }));

  function handleRadarInviteAction(inviteId: string, action: "respond" | "ignore") {
    setRadarInvites((currentInvites) =>
      currentInvites.map((invite) =>
        invite.id === inviteId
          ? {
              ...invite,
              status: action === "respond" ? "responded" : "ignored",
              statusLabel: action === "respond" ? "已回应" : "已忽略",
            }
          : invite,
      ),
    );
  }

  return (
    <main className="supply-task-record-scene">
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        <SupplyUiLabTopBar activeLabel="任务记录" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-task-record-shell" aria-label="任务记录静态页">
          <TaskRecordSidebar
            activeMode={activeMode}
            data={data}
            onSelectMode={setActiveMode}
            radarInvites={radarInvites}
          />
          <TaskRecordMainPanel
            activeDateKey={activeDateKey}
            activeMode={activeMode}
            data={data}
            filters={filters}
            onRadarInviteAction={handleRadarInviteAction}
            records={visibleRecords}
            radarInvites={radarInvites}
            selectedDate={selectedDate}
            onSelectDate={setActiveDateKey}
            onSelectFilter={(filterId) => setActiveFilterId(filterId as SupplyTaskRecordFilter["id"])}
          />
        </section>
      </div>
    </main>
  );
}

function TaskRecordSidebar({
  activeMode,
  data,
  onSelectMode,
  radarInvites,
}: {
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  onSelectMode: (mode: SupplyTaskRecordMode) => void;
  radarInvites: SupplyTaskRecordInvite[];
}) {
  return (
    <aside className="supply-task-record-sidebar" aria-label="任务记录分类">
      <SupplyUiLabPixelPanel
        ariaLabel="任务记录分类"
        className="supply-task-record-sidebar-card"
        title={
          <span className="supply-task-record-sidebar-title">
            <span aria-hidden="true">▣</span>
            任务记录
          </span>
        }
      >
        <nav className="supply-task-record-menu" aria-label="任务记录分类">
          {data.sidebar.menuItems.map((item) => {
            const isActive = item.id === activeMode;
            const badge = getMenuBadge(data, item.id, radarInvites);

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? "is-active" : undefined}
                key={item.id}
                onClick={() => onSelectMode(item.id)}
                type="button"
              >
                <span className="supply-task-record-menu-icon" aria-hidden="true">
                  <Image alt="" height={32} src={item.iconImage} unoptimized width={32} />
                </span>
                <span className="supply-task-record-menu-label">{item.label}</span>
                {badge ? (
                  <small aria-label={`${item.label}数量 ${badge}`} className="supply-task-record-menu-badge">
                    {badge}
                  </small>
                ) : null}
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </nav>
        <div
          className="supply-task-record-sidebar-mascot"
          aria-label="补给大厅引导"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8, 13, 20, 0.18), rgba(8, 13, 20, 0.82)), url(${data.sidebar.mascot.background})`,
          }}
        >
          <Image alt="" height={124} src={data.sidebar.mascot.hero} unoptimized width={124} />
          <p>记录每次脱脂成果，把银子花在刀刃上。</p>
        </div>
        <Link className="supply-task-record-back-link" href={data.sidebar.backHref}>
          返回大厅
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function TaskRecordMainPanel({
  activeDateKey,
  activeMode,
  data,
  filters,
  onRadarInviteAction,
  onSelectDate,
  onSelectFilter,
  radarInvites,
  records,
  selectedDate,
}: {
  activeDateKey: string;
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  filters: SupplyTaskRecordFilter[];
  onRadarInviteAction: (inviteId: string, action: "respond" | "ignore") => void;
  onSelectDate: (dateKey: string) => void;
  onSelectFilter: (filterId: string) => void;
  radarInvites: SupplyTaskRecordInvite[];
  records: SupplyTaskRecordTimelineItem[];
  selectedDate?: SupplyTaskRecordDateOption;
}) {
  return (
    <section className="supply-task-record-timeline-panel" aria-labelledby="task-record-title">
      <SupplyUiLabPixelPanel ariaLabel={modeTitles[activeMode]} className="supply-task-record-timeline-card">
        <header className="supply-task-record-timeline-header">
          <div>
            <p>{activeMode === "today" ? selectedDate?.label : "完整视图"}</p>
            <h1 id="task-record-title">{modeTitles[activeMode]}</h1>
          </div>
          <div className="supply-task-record-day">
            <strong>{selectedDate?.dateLabel ?? "最近"}</strong>
            <span>{selectedDate?.weekday ?? "全部记录"}</span>
          </div>
        </header>
        {activeMode === "today" ? (
          <TaskTimelinePanel
            activeDateKey={activeDateKey}
            data={data}
            filters={filters}
            records={records}
            onSelectDate={onSelectDate}
            onSelectFilter={onSelectFilter}
          />
        ) : null}
        {activeMode === "draws" ? <DrawHistoryPanel draws={data.drawHistory} /> : null}
        {activeMode === "redemptions" ? <RedemptionFullPanel items={data.redemptions.items} /> : null}
        {activeMode === "radar" ? (
          <RadarFullPanel invites={radarInvites} onInviteAction={onRadarInviteAction} />
        ) : null}
        {activeMode === "rules" ? <RulesPanel rules={data.rules} /> : null}
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function TaskTimelinePanel({
  activeDateKey,
  data,
  filters,
  onSelectDate,
  onSelectFilter,
  records,
}: {
  activeDateKey: string;
  data: SupplyTaskRecordPreview;
  filters: SupplyTaskRecordFilter[];
  onSelectDate: (dateKey: string) => void;
  onSelectFilter: (filterId: string) => void;
  records: SupplyTaskRecordTimelineItem[];
}) {
  const activeFilterId = filters.find((filter) => filter.active)?.id ?? "all";
  const completeLabel = activeFilterId === "all" ? "已显示今日全部记录" : "已显示当前筛选全部记录";

  return (
    <>
      <div className="supply-task-record-date-tabs" role="tablist" aria-label="记录日期">
        {data.dates.map((date) => (
          <button
            aria-selected={date.key === activeDateKey}
            key={date.key}
            onClick={() => onSelectDate(date.key)}
            role="tab"
            type="button"
          >
            <span>{date.label}</span>
            <small>{date.dateLabel}</small>
          </button>
        ))}
      </div>
      <div className="supply-task-record-filters">
        <SupplyUiLabFilterBar ariaLabel="记录筛选" filters={filters} onSelect={onSelectFilter} />
      </div>
      <div className="supply-task-record-timeline" aria-label="任务记录时间线">
        {records.length > 0 ? (
          records.map((record) => <TimelineItem key={record.id} record={record} />)
        ) : (
          <div className="supply-task-record-empty supply-task-record-empty-state" role="status">
            <strong>当前筛选没有记录</strong>
            <strong>这一天还没有任务记录</strong>
            <p>空状态来自本地 recordsByDate，不再展示假数据。</p>
          </div>
        )}
      </div>
      {records.length > 0 ? <p className="supply-task-record-complete">{completeLabel}</p> : null}
    </>
  );
}

function TimelineItem({ record }: { record: SupplyTaskRecordTimelineItem }) {
  const eventType = timelineEventTypeByCategory[record.category];

  return (
    <article
      className="supply-task-record-timeline-item"
      data-event-type={eventType}
      data-status={record.status}
      data-testid="task-record-timeline-item"
    >
      <time>{record.time}</time>
      <span className="supply-task-record-dot" aria-hidden="true" />
      <span className="supply-task-record-event-icon" aria-hidden="true">
        {timelineEventIconByType[eventType]}
      </span>
      <div className="supply-task-record-entry">
        <div className="supply-task-record-entry-icon" aria-hidden="true">
          {record.icon.type === "image" ? (
            <Image src={record.icon.value} alt="" width={44} height={44} unoptimized />
          ) : (
            record.icon.value
          )}
        </div>
        <div className="supply-task-record-entry-copy">
          <span data-tone={record.categoryTone}>{record.categoryLabel}</span>
          <h2>{record.title}</h2>
          {record.subtitle ? <p>{record.subtitle}</p> : null}
        </div>
        <div className="supply-task-record-reward">
          <b aria-hidden="true">{record.reward.icon}</b>
          <span>
            {record.reward.label} {record.reward.amount}
          </span>
        </div>
        <SupplyUiLabStatusBadge tone={timelineStatusTone[record.status]}>{record.statusLabel}</SupplyUiLabStatusBadge>
      </div>
    </article>
  );
}

function DrawHistoryPanel({ draws }: { draws: SupplyTaskRecordDrawHistoryItem[] }) {
  return (
    <div className="supply-task-record-draw-list" aria-label="抽卡历史">
      {draws.map((draw) => (
        <article className="supply-task-record-draw" data-testid="task-record-draw-history" key={draw.id}>
          <div className="supply-task-record-draw-meta">
            <strong>{draw.drawType}</strong>
            <time>{draw.time}</time>
            <span>消耗抽奖券 {draw.ticketSpent}</span>
          </div>
          <SupplyUiLabStatusBadge tone={draw.guaranteeApplied ? "warning" : "muted"}>
            {draw.guaranteeLabel}
          </SupplyUiLabStatusBadge>
          <div className="supply-task-record-reward-grid" aria-label={`${draw.drawType}奖励明细`}>
            {draw.rewards.map((reward) => (
              <span key={`${draw.id}-${reward.name}-${reward.quantityLabel}`}>
                <b>{reward.rarity}</b>
                {reward.name} {reward.quantityLabel}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RedemptionFullPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整兑换记录">
      {items.map((item) => (
        <div data-testid="task-record-redemption-full" key={item.id}>
          <RedemptionRecord item={item} />
        </div>
      ))}
    </div>
  );
}

function RadarFullPanel({
  invites,
  onInviteAction,
}: {
  invites: SupplyTaskRecordInvite[];
  onInviteAction: (inviteId: string, action: "respond" | "ignore") => void;
}) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整队友雷达">
      {invites.map((invite) => (
        <div data-testid="task-record-radar-invite-full" key={invite.id}>
          <InviteRecord invite={invite} onInviteAction={onInviteAction} />
        </div>
      ))}
    </div>
  );
}

function RulesPanel({ rules }: { rules: string[] }) {
  return (
    <ol className="supply-task-record-rules-list" aria-label="任务记录规则说明">
      {rules.map((rule) => (
        <li data-testid="task-record-rule" key={rule}>
          {rule}
        </li>
      ))}
    </ol>
  );
}

function InviteRecord({
  invite,
  onInviteAction,
}: {
  invite: SupplyTaskRecordInvite;
  onInviteAction: (inviteId: string, action: "respond" | "ignore") => void;
}) {
  return (
    <article className="supply-task-record-invite" data-testid="task-record-radar-invite" key={invite.id}>
      <Image src={invite.avatar} alt={invite.name} width={54} height={54} unoptimized />
      <div>
        <h3>{invite.name}</h3>
        <p>{invite.message}</p>
        <time>{invite.timeLabel}</time>
      </div>
      <div className="supply-task-record-radar-actions">
        <SupplyUiLabStatusBadge tone={radarStatusTone[invite.status]}>{invite.statusLabel}</SupplyUiLabStatusBadge>
        {invite.status === "pending" ? (
          <button type="button" onClick={() => onInviteAction(invite.id, "respond")}>
            回应
          </button>
        ) : null}
        {invite.status === "pending" ? (
          <button type="button" onClick={() => onInviteAction(invite.id, "ignore")}>
            忽略
          </button>
        ) : null}
      </div>
    </article>
  );
}

function RedemptionRecord({ item }: { item: SupplyTaskRecordRedemption }) {
  return (
    <article className="supply-task-record-redemption" data-status={item.status} data-testid="task-record-redemption">
      <div className="supply-task-record-redemption-icon">
        <Image src={item.icon} alt="" width={54} height={54} unoptimized />
      </div>
      <div>
        <h3>{item.title}</h3>
        <p>{item.requestedAt}</p>
        <p>{item.secondaryLabel}</p>
      </div>
      <SupplyUiLabStatusBadge tone={redemptionStatusTone[item.status]}>{item.statusLabel}</SupplyUiLabStatusBadge>
    </article>
  );
}
