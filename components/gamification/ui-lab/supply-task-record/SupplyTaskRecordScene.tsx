import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyTaskRecordInvite,
  SupplyTaskRecordPreview,
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

export function SupplyTaskRecordScene({ data }: { data: SupplyTaskRecordPreview }) {
  return (
    <main className="supply-task-record-scene">
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        <SupplyUiLabTopBar activeLabel="任务记录" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-task-record-shell" aria-label="任务记录静态页">
          <TaskRecordSidebar data={data} />
          <TaskTimelinePanel data={data} />
          <aside className="supply-task-record-aside" aria-label="任务记录侧栏">
            <TeammateRadarPanel invites={data.radar.invites} tabs={data.radar.tabs} />
            <RedemptionStatusPanel items={data.redemptions.items} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function TaskRecordSidebar({ data }: { data: SupplyTaskRecordPreview }) {
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
          {data.sidebar.menuItems.map((item) => (
            <button
              aria-pressed={item.active}
              className={item.active ? "is-active" : undefined}
              key={item.id}
              type="button"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
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

function TaskTimelinePanel({ data }: { data: SupplyTaskRecordPreview }) {
  return (
    <section className="supply-task-record-timeline-panel" aria-labelledby="task-record-title">
      <SupplyUiLabPixelPanel ariaLabel="任务记录时间线" className="supply-task-record-timeline-card">
        <header className="supply-task-record-timeline-header">
          <div>
            <p>{data.day.label}</p>
            <h1 id="task-record-title">任务记录</h1>
          </div>
          <div className="supply-task-record-day">
            <strong>{data.day.dateLabel}</strong>
            <span>{data.day.weekday}</span>
          </div>
        </header>
        <div className="supply-task-record-filters">
          <SupplyUiLabFilterBar ariaLabel="记录筛选" filters={data.filters} />
        </div>
        <div className="supply-task-record-timeline" aria-label="今天的任务记录">
          {data.timelineRecords.map((record) => (
            <TimelineItem key={record.id} record={record} />
          ))}
        </div>
        <SupplyUiLabActionButton className="supply-task-record-load-more" tone="secondary">
          加载更多记录 <span aria-hidden="true">⌄</span>
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function TimelineItem({ record }: { record: SupplyTaskRecordTimelineItem }) {
  return (
    <article className="supply-task-record-timeline-item" data-status={record.status} data-testid="task-record-timeline-item">
      <time>{record.time}</time>
      <span className="supply-task-record-dot" aria-hidden="true" />
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

function TeammateRadarPanel({
  tabs,
  invites,
}: {
  tabs: SupplyTaskRecordPreview["radar"]["tabs"];
  invites: SupplyTaskRecordInvite[];
}) {
  return (
    <section className="supply-task-record-radar" aria-labelledby="task-record-radar-title">
      <SupplyUiLabPixelPanel
        ariaLabel="队友雷达"
        className="supply-task-record-radar-card"
        title={
          <span className="supply-task-record-side-title">
            <span id="task-record-radar-title">队友雷达</span>
            <button type="button">全部已读</button>
          </span>
        }
      >
        <div className="supply-task-record-radar-tabs" role="tablist" aria-label="队友雷达状态">
          {tabs.map((tab) => (
            <button aria-selected={tab.active} key={tab.id} role="tab" type="button">
              {tab.label}
            </button>
          ))}
        </div>
        <div className="supply-task-record-invite-list">
          {invites.map((invite) => (
            <article className="supply-task-record-invite" data-testid="task-record-radar-invite" key={invite.id}>
              <Image src={invite.avatar} alt={invite.name} width={54} height={54} unoptimized />
              <div>
                <h3>{invite.name}</h3>
                <p>{invite.message}</p>
                <time>{invite.timeLabel}</time>
              </div>
              <div className="supply-task-record-radar-actions">
                <SupplyUiLabStatusBadge tone="warning">{invite.statusLabel}</SupplyUiLabStatusBadge>
                <button type="button">回应</button>
                <button type="button">忽略</button>
              </div>
            </article>
          ))}
        </div>
        <SupplyUiLabActionButton className="supply-task-record-view-all" tone="ghost">
          查看全部 <span aria-hidden="true">›</span>
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function RedemptionStatusPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <section className="supply-task-record-redemptions" aria-labelledby="task-record-redemptions-title">
      <SupplyUiLabPixelPanel
        ariaLabel="兑换状态"
        className="supply-task-record-redemptions-card"
        title={<span id="task-record-redemptions-title">兑换状态</span>}
      >
        <div className="supply-task-record-redemption-list">
          {items.map((item) => (
            <article
              className="supply-task-record-redemption"
              data-status={item.status}
              data-testid="task-record-redemption"
              key={item.id}
            >
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
          ))}
        </div>
        <SupplyUiLabActionButton className="supply-task-record-view-all" tone="ghost">
          查看全部 <span aria-hidden="true">›</span>
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </section>
  );
}
