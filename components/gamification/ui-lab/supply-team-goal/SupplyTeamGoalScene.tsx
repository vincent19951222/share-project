import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyTeamGoalPreview,
  TeamGoalMilestone,
  TeamGoalRewardPreview,
  TeamGoalTask,
  TeamGoalTaskStatus,
} from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTaskTone(status: TeamGoalTaskStatus): "success" | "warning" | "muted" {
  if (status === "completed") {
    return "success";
  }

  if (status === "active") {
    return "warning";
  }

  return "muted";
}

function getTaskStatusLabel(status: TeamGoalTaskStatus) {
  return {
    active: "进行中",
    completed: "已完成",
    locked: "未解锁",
  }[status];
}

export function SupplyTeamGoalScene({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <main className="supply-team-goal-scene" aria-label="团队目标 UI Lab">
      <div className="supply-team-goal-background" aria-hidden="true" />
      <div className="supply-team-goal-content">
        <SupplyUiLabTopBar activeLabel="团队目标" profile={data.topBar.profile} resources={data.topBar.resources} />
        <header className="supply-team-goal-header">
          <Link className="supply-team-goal-back-button" href="/ui-lab/supply-dashboard">
            ← 返回大厅
          </Link>
          <h1>✦ 团队目标 ✦</h1>
        </header>
        <RaidPanel data={data} />
        <MilestoneRoad data={data} />
        <section className="supply-team-goal-lower-grid">
          <TeamTasks data={data} />
          <RewardPreview data={data} />
        </section>
        <AnnouncementPanel data={data} />
      </div>
    </main>
  );
}

function RaidPanel({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="本周团队副本" className="supply-team-goal-raid-panel">
      <section className="supply-team-goal-team-card" aria-label="团队信息">
        <h2>本周团队副本</h2>
        <Image
          alt=""
          className="supply-team-goal-crest"
          height={128}
          src={data.media.crest}
          unoptimized
          width={128}
        />
        <div>
          <h3>{data.team.name}</h3>
          <p>Lv.{data.team.level} 团队</p>
          <p>
            {data.team.memberCount}/{data.team.memberLimit} 成员
          </p>
        </div>
        <SupplyUiLabActionButton tone="secondary">成员名单</SupplyUiLabActionButton>
      </section>

      <section className="supply-team-goal-season-summary" aria-label="赛季目标">
        <p>
          {data.season.label}：{data.season.goalName}
        </p>
        <span>
          {data.season.dateRange} 剩余 {data.season.remainingDays} 天
        </span>
        <h2>
          {formatNumber(data.season.currentPoints)}
          <small> / {formatNumber(data.season.targetPoints)}</small>
        </h2>
        <SupplyUiLabProgress current={data.season.currentPoints} label="团队进度" max={data.season.targetPoints} />
        <strong>{data.season.progressPercent}%</strong>
      </section>

      <section className="supply-team-goal-vault" aria-label="牛马金库">
        <h2>牛马金库</h2>
        <Image alt="" height={118} src={data.media.vaultChest} unoptimized width={118} />
        <strong>{formatNumber(data.vault.amount)}</strong>
        <p>{data.vault.helper}</p>
        <SupplyUiLabActionButton tone="primary">宝库商店</SupplyUiLabActionButton>
      </section>

      <section className="supply-team-goal-season-rewards" aria-label="赛季奖励">
        <h2>赛季目标</h2>
        <p>全队累计完成 120,000 点团队进度，解锁丰厚奖励！</p>
        {data.seasonRewards.map((reward) => (
          <div key={reward.id}>
            <span aria-hidden="true">{reward.icon}</span>
            <span>
              {reward.label}：{reward.value}
            </span>
          </div>
        ))}
      </section>
    </SupplyUiLabPixelPanel>
  );
}

function MilestoneRoad({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-road" aria-label="团队目标里程碑">
      <Image alt="" fill priority sizes="100vw" src={data.media.roadBackground} unoptimized />
      <div className="supply-team-goal-road-line" aria-hidden="true" />
      <div className="supply-team-goal-road-track">
        {data.milestones.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}

function MilestoneCard({ milestone }: { milestone: TeamGoalMilestone }) {
  return (
    <article className={`supply-team-goal-milestone is-${milestone.status}`} data-testid="team-goal-milestone">
      <strong>{milestone.title}</strong>
      <span>{formatNumber(milestone.targetPoints)}</span>
      <div aria-hidden="true">★</div>
      <b>{milestone.order}</b>
      <em>{milestone.rewardLabel}</em>
    </article>
  );
}

function TeamTasks({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="今日团队任务" className="supply-team-goal-tasks">
      <header>
        <h2>今日团队任务</h2>
        <span>明日 05:18:22 后刷新</span>
      </header>
      <div className="supply-team-goal-task-list">
        {data.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function TaskRow({ task }: { task: TeamGoalTask }) {
  return (
    <article className="supply-team-goal-task" data-testid="team-goal-task">
      <span className="supply-team-goal-task-icon" aria-hidden="true">
        {task.icon}
      </span>
      <div>
        <h3>{task.title}</h3>
        <p>{task.subtitle}</p>
      </div>
      <strong>
        {task.current}/{task.target} {task.unit}
      </strong>
      <SupplyUiLabProgress current={task.current} label={task.title} max={task.target} />
      <p>
        {task.reward.icon} {task.reward.label} {task.reward.value}
      </p>
      <SupplyUiLabStatusBadge tone={getTaskTone(task.status)}>{getTaskStatusLabel(task.status)}</SupplyUiLabStatusBadge>
    </article>
  );
}

function RewardPreview({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="奖励预览" className="supply-team-goal-rewards">
      <header>
        <h2>奖励预览</h2>
        <SupplyUiLabActionButton tone="ghost">全部奖励</SupplyUiLabActionButton>
      </header>
      <div className="supply-team-goal-reward-grid">
        {data.rewardPreview.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </div>
      <div className="supply-team-goal-claim">
        <SupplyUiLabActionButton tone="primary">领取团队奖励</SupplyUiLabActionButton>
        <span>达成所有阶段即可领取全部奖励</span>
        <strong>
          当前阶段：{data.season.currentStage}/{data.season.totalStages}
        </strong>
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function RewardCard({ reward }: { reward: TeamGoalRewardPreview }) {
  return (
    <article className={`supply-team-goal-reward is-${reward.tone}`} data-testid="team-goal-reward">
      <h3>{reward.title}</h3>
      {reward.image ? (
        <Image alt="" height={92} src={reward.image} unoptimized width={92} />
      ) : (
        <strong>{reward.icon}</strong>
      )}
      <p>{reward.subtitle}</p>
    </article>
  );
}

function AnnouncementPanel({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <footer className="supply-team-goal-announcement" aria-label="团队公告">
      <span className="supply-team-goal-announcement-icon" aria-hidden="true">
        !
      </span>
      <span>{data.announcement.message}</span>
      <nav aria-label="团队目标辅助入口">
        <a href="#help">帮助中心</a>
        <a href="#feedback">意见反馈</a>
        <a href="#settings">设置</a>
      </nav>
    </footer>
  );
}
