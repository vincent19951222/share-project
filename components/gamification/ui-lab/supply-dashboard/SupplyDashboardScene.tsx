import Image from "next/image";

import { supplyDashboardAssetPaths } from "./mock-data";
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

function GameTopBar({ data }: { data: SupplyDashboardPreview }) {
  return (
    <header className="supply-dashboard-topbar">
      <div className="supply-dashboard-brand">
        <span className="supply-dashboard-brand-mark" aria-hidden="true">
          NS
        </span>
        <div>
          <p className="supply-dashboard-kicker">Dashboard UI Lab</p>
          <h1>牛马补给站</h1>
        </div>
      </div>

      <div className="supply-dashboard-resource-list" aria-label="资源状态">
        {data.resources.map((resource) => (
          <div className="supply-dashboard-resource-pill" key={resource.id}>
            <span aria-hidden="true">{resource.icon}</span>
            <span>{resource.label}</span>
            <strong>{formatResource(resource.value, resource.maxValue)}</strong>
          </div>
        ))}
      </div>
    </header>
  );
}

function CharacterStatusPanel({ data }: { data: SupplyDashboardPreview }) {
  const progress = Math.round((data.profile.exp / data.profile.nextLevelExp) * 100);

  return (
    <aside className="supply-dashboard-status-panel" aria-label="角色状态">
      <div className="supply-dashboard-section-heading">
        <p>角色状态</p>
        <strong>Lv.{data.profile.level}</strong>
      </div>

      <div className="supply-dashboard-profile-card">
        <Image
          alt={`${data.profile.username} 的头像`}
          className="supply-dashboard-avatar"
          height={72}
          src={data.profile.avatar}
          unoptimized
          width={72}
        />
        <div>
          <h2>{data.profile.username}</h2>
          <p>{data.profile.title}</p>
          <span>{data.profile.streakDays} 天连续打卡</span>
        </div>
      </div>

      <div className="supply-dashboard-exp-block">
        <div>
          <span>经验</span>
          <strong>
            {data.profile.exp}/{data.profile.nextLevelExp}
          </strong>
        </div>
        <div className="supply-dashboard-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="supply-dashboard-effect-list">
        {data.activeEffects.map((effect) => (
          <article className="supply-dashboard-effect-card" key={effect.id}>
            <span aria-hidden="true">{effect.icon}</span>
            <div>
              <strong>
                {effect.label} {effect.value}
              </strong>
              <p>{effect.expiresIn}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function HeroCharacterStage({ data }: { data: SupplyDashboardPreview }) {
  return (
    <section className="supply-dashboard-hero-stage" aria-label="补给站主视觉">
      <div className="supply-dashboard-hero-copy">
        <p>今日主线</p>
        <h2>{data.motto}</h2>
      </div>
      <Image
        alt="脱脂牛马角色站在补给站前"
        className="supply-dashboard-hero-image"
        height={680}
        priority
        src={supplyDashboardAssetPaths.hero}
        unoptimized
        width={520}
      />
    </section>
  );
}

function QuestCard({ quest }: { quest: SupplyDashboardQuest }) {
  return (
    <article className="supply-dashboard-quest-card">
      <Image
        alt={quest.title}
        className="supply-dashboard-quest-image"
        height={128}
        src={quest.image}
        unoptimized
        width={128}
      />
      <div className="supply-dashboard-quest-body">
        <div className="supply-dashboard-quest-meta">
          <span>{quest.difficulty}</span>
          <span>{quest.durationLabel}</span>
          {quest.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <h3>{quest.title}</h3>
        <p>{quest.subtitle}</p>
        <div className="supply-dashboard-quest-reward">
          <span aria-hidden="true">{quest.reward.icon}</span>
          <strong>
            +{quest.reward.amount} {quest.reward.label}
          </strong>
          <em>{quest.completed ? "已完成" : "进行中"}</em>
        </div>
      </div>
    </article>
  );
}

function DailyQuestPanel({ quests }: { quests: SupplyDashboardQuest[] }) {
  return (
    <section className="supply-dashboard-quest-panel" aria-label="任务记录">
      <div className="supply-dashboard-section-heading">
        <p>任务记录</p>
        <strong>{quests.filter((quest) => quest.completed).length}/{quests.length}</strong>
      </div>
      <div className="supply-dashboard-quest-list">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>
    </section>
  );
}

function DashboardShortcutDock({ data }: { data: SupplyDashboardPreview }) {
  return (
    <nav className="supply-dashboard-shortcut-dock" aria-label="快捷入口">
      <a href="#inventory">
        <Image
          alt=""
          aria-hidden="true"
          height={112}
          src={supplyDashboardAssetPaths.dockBackpack}
          unoptimized
          width={112}
        />
        <span>背包</span>
        <strong>
          {data.inventoryPreview.usedSlots}/{data.inventoryPreview.totalSlots}
        </strong>
      </a>
      <a href="#supply">
        <Image
          alt=""
          aria-hidden="true"
          height={112}
          src={supplyDashboardAssetPaths.dockSupplyMachine}
          unoptimized
          width={112}
        />
        <span>补给机</span>
        <strong>
          {data.supplyPreview.remainingDraws}/{data.supplyPreview.maxDraws}
        </strong>
      </a>
      <a href="#quests">
        <Image
          alt=""
          aria-hidden="true"
          height={112}
          src={supplyDashboardAssetPaths.dockTaskRecord}
          unoptimized
          width={112}
        />
        <span>任务记录</span>
        <strong>{data.dailyQuests.length}</strong>
      </a>
    </nav>
  );
}

function TeamAnnouncementBar({ message }: { message: string }) {
  return (
    <aside className="supply-dashboard-announcement" aria-label="团队公告">
      <span aria-hidden="true">!</span>
      <p>{message}</p>
    </aside>
  );
}

export function SupplyDashboardScene({
  data,
}: {
  data: SupplyDashboardPreview;
}) {
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
        <GameTopBar data={data} />
        <div className="supply-dashboard-main">
          <CharacterStatusPanel data={data} />
          <HeroCharacterStage data={data} />
          <DailyQuestPanel quests={data.dailyQuests} />
        </div>
        <DashboardShortcutDock data={data} />
        <TeamAnnouncementBar message={data.announcement.message} />
      </div>
    </main>
  );
}
