"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { TaskCardPreview } from "@/components/gamification/ui-lab/task-cards/TaskCardPreview";
import type { SupplyTaskCardPreviewData } from "@/components/gamification/ui-lab/task-cards/types";
import { supplyDashboardAssetPaths } from "./mock-data";
import {
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
} from "./SupplyUiLabPrimitives";
import { SupplyUiLabTopBar, type SupplyUiLabResource } from "./SupplyUiLabTopBar";
import type {
  SupplyDashboardPreview,
  SupplyDashboardQuest,
} from "./types";

function formatResource(value: number, maxValue?: number) {
  const current = new Intl.NumberFormat("zh-CN").format(value);

  if (maxValue === undefined) {
    return current;
  }

  return `${current}/${new Intl.NumberFormat("zh-CN").format(maxValue)}`;
}

function getTopBarResources(data: SupplyDashboardPreview): SupplyUiLabResource[] {
  return data.resources.map((resource) => ({
    id: resource.id,
    label: resource.label,
    value: formatResource(resource.value, resource.maxValue),
    icon: resource.icon,
    iconImage: resource.iconImage,
  }));
}

function toTaskCardPreviewData(quest: SupplyDashboardQuest): SupplyTaskCardPreviewData {
  return {
    id: quest.id,
    dimension: quest.dimension,
    slogan: quest.subtitle,
    title: quest.title,
    description: "",
    image: quest.image,
    difficulty: quest.difficulty,
    sceneLabel: (quest.tags[0] ?? "通用") as SupplyTaskCardPreviewData["sceneLabel"],
    cooldownLabel: quest.durationLabel,
    completed: quest.completed,
    aspectRatio: "3:4",
  };
}

function CharacterStatusPanel({ data }: { data: SupplyDashboardPreview }) {
  return (
    <SupplyUiLabPixelPanel className="supply-dashboard-status-panel" ariaLabel="角色状态">
      <div className="supply-dashboard-section-heading">
        <div>
          <h2>角色状态</h2>
        </div>
      </div>

      <div className="supply-dashboard-title-card">
        <span>称号 / 牛马等级</span>
        <strong>
          {data.profile.title}
          <b>Lv.{data.profile.level}</b>
        </strong>
      </div>

      <div className="supply-dashboard-status-divider" />

      <section className="supply-dashboard-effect-panel" aria-label="今日效果">
        <h3>今日效果</h3>
        <div className="supply-dashboard-effect-list">
          {data.activeEffects.map((effect) => (
            <article className="supply-dashboard-effect-card" data-effect={effect.id} key={effect.id}>
              <Image
                alt=""
                className="supply-dashboard-effect-icon"
                height={40}
                src={effect.icon}
                unoptimized
                width={40}
              />
              <div>
                <strong>{effect.label}</strong>
                <p>{effect.effectSummary}</p>
                <time>
                  {effect.statusLabel} · {effect.endsAtLabel}
                </time>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="supply-dashboard-streak-card">
        <span>连续打卡</span>
        <strong>
          <em aria-hidden="true">🔥</em>
          {data.profile.streakDays}
          <small>天</small>
        </strong>
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function HeroCharacterStage({ data }: { data: SupplyDashboardPreview }) {
  const remainingExp = data.profile.nextLevelExp - data.profile.currentLevelExp;

  return (
    <section className="supply-dashboard-hero-stage" aria-label="补给站主视觉">
      <div className="supply-dashboard-hero-copy">
        <p>今日主线</p>
        <h2>{data.motto}</h2>
      </div>
      <Image
        alt="脱脂牛马角色站在健身房里举哑铃"
        className="supply-dashboard-hero-image"
        height={832}
        priority
        src={supplyDashboardAssetPaths.hero}
        unoptimized
        width={594}
      />
      <div className="supply-dashboard-hero-status" aria-label="等级经验">
        <strong>Lv.{data.profile.level}</strong>
        <div className="supply-dashboard-hero-progress">
          <SupplyUiLabProgress
            current={data.profile.currentLevelExp}
            label="等级经验"
            max={data.profile.nextLevelExp}
            valueDisplay="tooltip"
            showPercent
          />
        </div>
        <p>距离升级还差 {remainingExp} EXP</p>
        <Image
          alt=""
          aria-hidden="true"
          className="supply-dashboard-level-avatar"
          height={72}
          src={supplyDashboardAssetPaths.levelAvatar}
          unoptimized
          width={72}
        />
      </div>
    </section>
  );
}

function QuestCard({
  onComplete,
  index,
  onReroll,
  quest,
}: {
  onComplete: (questId: string) => void;
  index: number;
  onReroll: (questTitle: string) => void;
  quest: SupplyDashboardQuest;
}) {
  const stateLabel = quest.completed ? "已完成" : "进行中";

  return (
    <div className="supply-dashboard-quest-card-shell" data-complete={quest.completed}>
      <TaskCardPreview
        card={toTaskCardPreviewData(quest)}
        className={`supply-dashboard-quest-card supply-dashboard-quest-card--${index + 1}`}
        density="dashboard"
        showControls={false}
      />
      {quest.completed ? (
        <div className="supply-dashboard-quest-card-complete-overlay" aria-hidden="true">
          <span>✓</span>
          <strong>已完成</strong>
        </div>
      ) : null}
      {!quest.completed ? (
        <button
          className="supply-dashboard-quest-card-hitbox"
          onClick={() => onComplete(quest.id)}
          type="button"
          aria-label={`打卡：${quest.title}`}
          title={`打卡：${quest.title}`}
        />
      ) : null}
      <div className="supply-dashboard-quest-card-actions" aria-label={`${quest.title} 操作`}>
        <span
          className="supply-task-card-icon-action supply-task-card-icon-action--status"
          data-complete={quest.completed}
          aria-label={`${quest.title}：${stateLabel}`}
          role="status"
          title={stateLabel}
        >
          <span aria-hidden="true">{quest.completed ? "✓" : "•"}</span>
        </span>
        <button
          className="supply-task-card-icon-action supply-task-card-icon-action--reroll supply-task-card-reroll"
          onClick={() => onReroll(quest.title)}
          type="button"
          aria-label={`更换任务：${quest.title}`}
          title={`换一个：${quest.title}`}
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>
    </div>
  );
}

function DailyQuestPanel({
  onClaimRewards,
  onCompleteQuest,
  onRerollQuest,
  quests,
}: {
  onClaimRewards: () => void;
  onCompleteQuest: (questId: string) => void;
  onRerollQuest: (questTitle: string) => void;
  quests: SupplyDashboardQuest[];
}) {
  const completedCount = quests.filter((quest) => quest.completed).length;

  return (
    <SupplyUiLabPixelPanel className="supply-dashboard-quest-panel" ariaLabel="今日主线">
      <div className="supply-dashboard-quest-heading">
        <div>
          <span aria-hidden="true">⚑</span>
          <h2>今日主线</h2>
          <i aria-hidden="true">i</i>
        </div>
        <div className="supply-dashboard-quest-progress" aria-label={`任务进度 ${completedCount}/${quests.length}`}>
          <strong>进度：{completedCount}/{quests.length}</strong>
          <ol>
            {quests.map((quest) => (
              <li className={quest.completed ? "is-complete" : undefined} key={quest.id} />
            ))}
          </ol>
        </div>
      </div>
      <div className="supply-dashboard-quest-list">
        {quests.map((quest, index) => (
          <QuestCard
            index={index}
            key={quest.id}
            onComplete={onCompleteQuest}
            onReroll={onRerollQuest}
            quest={quest}
          />
        ))}
      </div>
      <div className="supply-dashboard-quest-footer">
        <p>
          完成全部任务可获得
          <span>EXP 200</span>
          <span>◎ 100</span>
          <span>抽奖券 1</span>
        </p>
        <button
          className="supply-ui-lab-action supply-ui-lab-action--primary"
          onClick={onClaimRewards}
          type="button"
        >
          领取奖励
        </button>
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function TaskCompletionConfirmDialog({
  onCancel,
  onConfirm,
  quest,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  quest: SupplyDashboardQuest;
}) {
  return (
    <div className="supply-dashboard-task-confirm-backdrop" role="presentation">
      <section
        className="supply-dashboard-task-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supply-dashboard-task-confirm-title"
      >
        <div className="supply-dashboard-task-confirm-header">
          <span>今日主线</span>
          <b>{quest.difficulty}</b>
        </div>
        <div className="supply-dashboard-task-confirm-body">
          <div className="supply-dashboard-task-confirm-art" aria-hidden="true">
            <Image alt="" fill sizes="112px" src={quest.image} unoptimized />
          </div>
          <div className="supply-dashboard-task-confirm-copy">
            <p>确认打卡</p>
            <h3 id="supply-dashboard-task-confirm-title">{quest.title}</h3>
            <div className="supply-dashboard-task-confirm-meta" aria-label="任务信息">
              <span>{quest.subtitle}</span>
              <span>{quest.tags[0] ?? "通用"}</span>
              <span>{quest.durationLabel}</span>
            </div>
            <div className="supply-dashboard-task-confirm-reward">
              <span>完成奖励</span>
              <strong>
                {quest.reward.icon} +{quest.reward.amount}
              </strong>
            </div>
          </div>
        </div>
        <div className="supply-dashboard-task-confirm-actions">
          <button className="supply-ui-lab-action" onClick={onCancel} type="button">
            取消
          </button>
          <button
            className="supply-ui-lab-action supply-ui-lab-action--primary"
            onClick={onConfirm}
            type="button"
          >
            确认打卡
          </button>
        </div>
      </section>
    </div>
  );
}

function DashboardShortcutDock({ data }: { data: SupplyDashboardPreview }) {
  return (
    <nav className="supply-dashboard-shortcut-dock" aria-label="快捷入口">
      {data.shortcutLinks.map((shortcut) => (
        <Link
          className={`supply-dashboard-shortcut-card supply-dashboard-shortcut-card--${shortcut.id}`}
          href={shortcut.href}
          key={shortcut.id}
        >
          <span className="supply-dashboard-shortcut-icon" aria-hidden="true">
            {shortcut.image ? (
              <Image alt="" height={112} src={shortcut.image} unoptimized width={112} />
            ) : (
              <b>⌂</b>
            )}
          </span>
          <span className="supply-dashboard-shortcut-copy">
            <strong>{shortcut.title}</strong>
            <small>{shortcut.subtitle}</small>
          </span>
          {shortcut.badge ? <em>{shortcut.badge}</em> : null}
          <i aria-hidden="true">→</i>
        </Link>
      ))}
    </nav>
  );
}

function TeamAnnouncementBar({ message }: { message: string }) {
  return (
    <aside className="supply-dashboard-announcement" aria-label="团队公告">
      <span aria-hidden="true">📣</span>
      <p>{message}</p>
    </aside>
  );
}

export function SupplyDashboardScene({
  data,
}: {
  data: SupplyDashboardPreview;
}) {
  const [dailyQuests, setDailyQuests] = useState(() => data.dailyQuests);
  const [feedbackMessage, setFeedbackMessage] = useState("本地预览：任务换班和奖励领取不会写入后端。");
  const [pendingQuestId, setPendingQuestId] = useState<string | null>(null);
  const pendingQuest = dailyQuests.find((quest) => quest.id === pendingQuestId) ?? null;

  function handleOpenCompleteQuest(questId: string) {
    const quest = dailyQuests.find((candidate) => candidate.id === questId);

    if (!quest || quest.completed) {
      return;
    }

    setPendingQuestId(questId);
  }

  function handleCancelCompleteQuest() {
    setPendingQuestId(null);
  }

  function handleConfirmCompleteQuest() {
    if (!pendingQuest) {
      return;
    }

    setDailyQuests((currentQuests) =>
      currentQuests.map((quest) =>
        quest.id === pendingQuest.id
          ? {
              ...quest,
              completed: true,
            }
          : quest,
      ),
    );
    setFeedbackMessage(`已完成打卡：${pendingQuest.title}。这是本地 demo 状态，刷新后会恢复 mock 数据。`);
    setPendingQuestId(null);
  }

  function handleRerollQuest(questTitle: string) {
    setFeedbackMessage(`已触发换班预览：${questTitle}。mock 数据保持不变。`);
  }

  function handleClaimRewards() {
    setFeedbackMessage("奖励领取预览：EXP、银子和抽奖券只展示反馈，不写入后端。");
  }

  return (
    <main className="supply-dashboard-scene" aria-label="牛马补给站 Dashboard UI Lab">
      <div className="supply-dashboard-background" aria-hidden="true">
        <Image
          alt=""
          fill
          priority
          sizes="100vw"
          src={supplyDashboardAssetPaths.background}
          unoptimized
        />
      </div>

      <div className="supply-dashboard-content">
        <SupplyUiLabTopBar
          activeLabel="我的状态"
          profile={{
            username: data.profile.username,
            avatar: data.profile.avatar,
          }}
          resources={getTopBarResources(data)}
        />
        <section className="supply-dashboard-stage" aria-label="我的状态原型舞台">
          <CharacterStatusPanel data={data} />
          <HeroCharacterStage data={data} />
          <DailyQuestPanel
            onClaimRewards={handleClaimRewards}
            onCompleteQuest={handleOpenCompleteQuest}
            onRerollQuest={handleRerollQuest}
            quests={dailyQuests}
          />
          {pendingQuest ? (
            <TaskCompletionConfirmDialog
              onCancel={handleCancelCompleteQuest}
              onConfirm={handleConfirmCompleteQuest}
              quest={pendingQuest}
            />
          ) : null}
          <p aria-live="polite" className="supply-dashboard-local-feedback" data-dashboard-feedback>
            {feedbackMessage}
          </p>
          <DashboardShortcutDock data={data} />
          <TeamAnnouncementBar message={data.announcement.message} />
        </section>
      </div>
    </main>
  );
}
