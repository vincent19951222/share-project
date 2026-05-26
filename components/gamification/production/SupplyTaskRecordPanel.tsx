"use client";

import { useMemo, useState } from "react";

import type {
  GamificationRedemptionSnapshot,
  SocialInvitationSnapshot,
  SupplyStationProductionSnapshot,
  SupplyTaskRecordSnapshot,
} from "@/lib/types";

type SupplyTaskRecordMode = "today" | "draws" | "redemptions" | "radar" | "rules";
type TimelineRow = SupplyTaskRecordSnapshot["timeline"][number];

export interface SupplyTaskRecordPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: string | null;
  onRespondSocialInvitation: (invitationId: string) => void;
}

const modes: Array<{ key: SupplyTaskRecordMode; label: string }> = [
  { key: "today", label: "今日记录" },
  { key: "draws", label: "抽卡记录" },
  { key: "redemptions", label: "兑换记录" },
  { key: "radar", label: "队友雷达" },
  { key: "rules", label: "规则说明" },
];

const ruleTexts = [
  "最近 7 天记录来自真实业务流水。",
  "抽奖、购买、兑换、道具和队友雷达会在操作成功后进入记录。",
  "管理员确认类福利以兑换状态为准。",
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function TimelineList({
  emptyText,
  rows,
}: {
  emptyText: string;
  rows: TimelineRow[];
}) {
  return rows.length > 0 ? (
    <div className="supply-production-task-record__timeline" aria-label="任务记录时间线">
      {rows.map((row) => (
        <article
          className="supply-production-task-record__row"
          data-category={row.category}
          data-testid="supply-task-record-row"
          key={row.id}
        >
          <time>{formatDateTime(row.occurredAt)}</time>
          <strong>{row.title}</strong>
          <p>{row.subtitle}</p>
          <span>{row.statusLabel}</span>
        </article>
      ))}
    </div>
  ) : (
    <p>{emptyText}</p>
  );
}

function RedemptionList({ items }: { items: GamificationRedemptionSnapshot[] }) {
  return items.length > 0 ? (
    <div className="supply-production-task-record__redemptions" aria-label="兑换记录">
      {items.map((item) => (
        <article key={item.id}>
          <time>{formatDateTime(item.requestedAt)}</time>
          <strong>{item.itemName}</strong>
          <p>{item.statusLabel}</p>
          {item.note ? <small>{item.note}</small> : null}
        </article>
      ))}
    </div>
  ) : (
    <p>暂时没有兑换记录</p>
  );
}

function RadarInviteList({
  activeAction,
  invites,
  onRespondSocialInvitation,
}: {
  activeAction: string | null;
  invites: SocialInvitationSnapshot[];
  onRespondSocialInvitation: (invitationId: string) => void;
}) {
  return invites.length > 0 ? (
    <div className="supply-production-task-record__radar" aria-label="队友雷达邀请">
      {invites.map((invite) => (
        <article key={invite.id}>
          <time>{formatDateTime(invite.createdAt)}</time>
          <strong>{invite.senderUsername ?? "队友"}</strong>
          <p>{invite.message}</p>
          <span>{invite.status}</span>
          {invite.status === "PENDING" ? (
            <button
              data-action="respond-social-invitation"
              data-invitation-id={invite.id}
              disabled={activeAction !== null}
              onClick={() => onRespondSocialInvitation(invite.id)}
              type="button"
            >
              {activeAction ? "响应中" : "回应"}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  ) : (
    <p>暂时没有队友雷达邀请</p>
  );
}

export function SupplyTaskRecordPanel({
  activeAction,
  onRespondSocialInvitation,
  snapshot,
}: SupplyTaskRecordPanelProps) {
  const [activeMode, setActiveMode] = useState<SupplyTaskRecordMode>("today");
  const [selectedDateKey, setSelectedDateKey] = useState(
    snapshot.taskRecord.dates[0]?.key ?? snapshot.dayKey,
  );
  const selectedDate =
    snapshot.taskRecord.dates.find((date) => date.key === selectedDateKey) ??
    snapshot.taskRecord.dates[0];
  const selectedDateRows = useMemo(
    () => snapshot.taskRecord.timeline.filter((row) => row.dayKey === selectedDate?.key),
    [selectedDate?.key, snapshot.taskRecord.timeline],
  );
  const drawRows = useMemo(
    () => snapshot.taskRecord.timeline.filter((row) => row.category === "draw"),
    [snapshot.taskRecord.timeline],
  );
  const radarInvites = [...snapshot.social.received, ...snapshot.social.teamWide];

  return (
    <section className="supply-production-task-record" aria-label="任务记录">
      <header className="supply-production-task-record__header">
        <div>
          <p>牛马补给站</p>
          <h2>任务记录</h2>
        </div>
        <div aria-label="记录资源摘要">
          <span>Lv.{snapshot.profile.level}</span>
          <span>{snapshot.resources.coins.label} {snapshot.resources.coins.value}</span>
          <span>{snapshot.resources.ticket.label} {snapshot.resources.ticket.value}</span>
        </div>
      </header>

      <nav className="supply-production-task-record__modes" aria-label="任务记录模式">
        {modes.map((mode) => (
          <button
            aria-pressed={activeMode === mode.key}
            data-mode={mode.key}
            key={mode.key}
            onClick={() => setActiveMode(mode.key)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </nav>

      {activeMode === "today" ? (
        <section aria-label="按日期查看记录">
          <div className="supply-production-task-record__dates" role="tablist" aria-label="记录日期">
            {snapshot.taskRecord.dates.map((date) => (
              <button
                aria-selected={date.key === selectedDate?.key}
                data-date-key={date.key}
                data-testid="supply-task-record-date"
                key={date.key}
                onClick={() => setSelectedDateKey(date.key)}
                role="tab"
                type="button"
              >
                <span>{date.label}</span>
                <small>{date.dateLabel} · {date.weekday}</small>
              </button>
            ))}
          </div>
          <TimelineList emptyText="这一天还没有任务记录" rows={selectedDateRows} />
        </section>
      ) : null}

      {activeMode === "draws" ? (
        <section aria-label="抽卡记录">
          <h3>抽卡记录</h3>
          <TimelineList emptyText="暂时没有抽卡记录" rows={drawRows} />
        </section>
      ) : null}

      {activeMode === "redemptions" ? (
        <section aria-label="兑换记录">
          <h3>兑换记录</h3>
          <RedemptionList items={snapshot.redemptions.mine} />
        </section>
      ) : null}

      {activeMode === "radar" ? (
        <section aria-label="队友雷达">
          <h3>队友雷达</h3>
          <RadarInviteList
            activeAction={activeAction}
            invites={radarInvites}
            onRespondSocialInvitation={onRespondSocialInvitation}
          />
        </section>
      ) : null}

      {activeMode === "rules" ? (
        <section aria-label="规则说明">
          <h3>规则说明</h3>
          <ul>
            {ruleTexts.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
