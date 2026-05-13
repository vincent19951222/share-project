import Image from "next/image";
import type {
  SupplyTeamGoalPreview,
  TeamGoalMilestone,
  TeamGoalRewardPreview,
  TeamGoalTask,
} from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getProgressPercent(current: number, target: number) {
  return Math.min(100, Math.round((current / target) * 100));
}

export function SupplyTeamGoalScene({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <main className="supply-team-goal-scene min-h-screen bg-[#fff7db] text-slate-950">
      <div className="supply-team-goal-background" aria-hidden="true" />
      <div className="supply-team-goal-content">
        <TopBar data={data} />
        <header className="supply-team-goal-header">
          <button type="button" className="supply-team-goal-back-button">
            ← 返回大厅
          </button>
          <h1>✦ 团队目标 ✦</h1>
        </header>
        <section className="supply-team-goal-raid-panel" aria-label="本周团队副本">
          <TeamIdentity data={data} />
          <SeasonSummary data={data} />
          <TeamVault data={data} />
          <SeasonRewards data={data} />
        </section>
        <MilestoneRoad data={data} />
        <section className="supply-team-goal-lower-grid">
          <TeamTasks tasks={data.tasks} />
          <RewardPreview data={data} />
        </section>
        <footer className="supply-team-goal-announcement">
          <span className="supply-team-goal-announcement-icon">📣</span>
          <strong>团队公告：</strong>
          <span>{data.announcement.message.replace("团队公告：", "")}</span>
          <nav aria-label="团队目标辅助入口">
            <a href="#help">帮助中心</a>
            <a href="#feedback">意见反馈</a>
            <a href="#settings">⚙</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function TopBar({ data }: { data: SupplyTeamGoalPreview }) {
  const navItems = ["我的状态", "团队目标", "排行榜", "补给商店", "任务记录"];

  return (
    <nav className="supply-team-goal-topbar" aria-label="牛马补给站导航">
      <div className="supply-team-goal-brand">
        <span className="supply-team-goal-brand-icon">🐮</span>
        <span>牛马补给站</span>
      </div>
      <div className="supply-team-goal-nav-items">
        {navItems.map((item) => (
          <button key={item} type="button" className={item === "团队目标" ? "is-active" : ""}>
            {item}
          </button>
        ))}
      </div>
      <div className="supply-team-goal-resources">
        {data.topBar.resources.map((resource) => (
          <span key={resource.id} className="supply-team-goal-resource">
            <span>{resource.icon}</span>
            <strong>{resource.value}</strong>
            <span className="supply-team-goal-resource-plus">+</span>
          </span>
        ))}
        <Image
          src={data.topBar.profile.avatar}
          alt=""
          width={44}
          height={44}
          className="supply-team-goal-avatar"
        />
      </div>
    </nav>
  );
}

function TeamIdentity({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-team-card">
      <h2>✦ 本周团队副本</h2>
      <Image src={data.team.crestImage} alt="" width={172} height={172} className="supply-team-goal-crest" />
      <div>
        <h3>{data.team.name}</h3>
        <p>Lv.{data.team.level} 团队</p>
        <p>
          👥 {data.team.memberCount}/{data.team.memberLimit} 成员
        </p>
      </div>
      <button type="button">查看成员</button>
    </div>
  );
}

function SeasonSummary({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-season-summary">
      <p>
        {data.season.label}：{data.season.goalName}
      </p>
      <span>
        {data.season.dateRange}　剩余 {data.season.remainingDays} 天
      </span>
      <h2>
        {formatNumber(data.season.currentPoints)} <small>/ {formatNumber(data.season.targetPoints)}</small>
      </h2>
      <div className="supply-team-goal-progress" aria-label={`团队进度 ${data.season.progressPercent}%`}>
        <span style={{ width: `${data.season.progressPercent}%` }} />
      </div>
      <strong>{data.season.progressPercent}%</strong>
    </div>
  );
}

function TeamVault({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <div className="supply-team-goal-vault">
      <h2>✦ 牛马金库</h2>
      <Image src={data.vault.image} alt="" width={176} height={136} />
      <strong>{formatNumber(data.vault.amount)} ◎</strong>
      <p>{data.vault.helper}</p>
      <button type="button">宝库商店 ›</button>
    </div>
  );
}

function SeasonRewards({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <aside className="supply-team-goal-season-rewards" aria-label="赛季目标奖励">
      <h2>赛季目标</h2>
      <p>全队累计完成 120,000 点团队进度，解锁丰厚奖励！</p>
      {data.seasonRewards.map((reward) => (
        <div key={reward.id}>
          <span>{reward.icon}</span>
          <span>
            {reward.label}：{reward.value}
          </span>
        </div>
      ))}
    </aside>
  );
}

function MilestoneRoad({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-road" aria-label="团队目标里程碑">
      <Image src="/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp" alt="" fill priority sizes="100vw" />
      <div className="supply-team-goal-road-line" aria-hidden="true" />
      <div className="supply-team-goal-road-track">
        {data.milestones.map((milestone) => (
          <MilestoneNode key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}

function MilestoneNode({ milestone }: { milestone: TeamGoalMilestone }) {
  const icon = milestone.status === "locked" ? "🔒" : milestone.status === "current" ? "⚔" : "✓";

  return (
    <article className={`supply-team-goal-milestone is-${milestone.status}`} data-testid="team-goal-milestone">
      <strong>{milestone.title}</strong>
      <span>{formatNumber(milestone.targetPoints)}</span>
      <div>{icon}</div>
      <b>{milestone.order}</b>
      <em>{milestone.rewardLabel}</em>
    </article>
  );
}

function TeamTasks({ tasks }: { tasks: TeamGoalTask[] }) {
  return (
    <section className="supply-team-goal-tasks" aria-label="今日团队任务">
      <header>
        <h2>今日团队任务</h2>
        <span>⏱ 明日 05:18:22 后刷新</span>
      </header>
      {tasks.map((task) => (
        <article key={task.id} className="supply-team-goal-task" data-testid="team-goal-task">
          <span className="supply-team-goal-task-icon">{task.icon}</span>
          <div>
            <h3>{task.title}</h3>
            <p>{task.subtitle}</p>
          </div>
          <strong>
            {task.current}/{task.target} {task.unit}
          </strong>
          <div className="supply-team-goal-task-progress">
            <span style={{ width: `${getProgressPercent(task.current, task.target)}%` }} />
          </div>
          <p>
            {task.reward.icon} {task.reward.label} {task.reward.value}
          </p>
          <button type="button">进行中</button>
        </article>
      ))}
    </section>
  );
}

function RewardPreview({ data }: { data: SupplyTeamGoalPreview }) {
  return (
    <section className="supply-team-goal-rewards" aria-label="奖励预览">
      <header>
        <h2>✦ 奖励预览</h2>
        <button type="button">全部奖励 ›</button>
      </header>
      <div className="supply-team-goal-reward-grid">
        {data.rewardPreview.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </div>
      <div className="supply-team-goal-claim">
        <button type="button">🎁 领取团队奖励</button>
        <span>达成所有阶段即可领取全部奖励</span>
        <strong>
          当前阶段：{data.season.currentStage}/{data.season.totalStages}
        </strong>
      </div>
    </section>
  );
}

function RewardCard({ reward }: { reward: TeamGoalRewardPreview }) {
  return (
    <article className={`supply-team-goal-reward is-${reward.tone}`} data-testid="team-goal-reward">
      <h3>{reward.title}</h3>
      {reward.image ? <Image src={reward.image} alt="" width={112} height={88} /> : <strong>{reward.icon}</strong>}
      <p>{reward.subtitle}</p>
    </article>
  );
}
