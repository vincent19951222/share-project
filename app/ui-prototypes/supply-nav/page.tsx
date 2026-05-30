"use client";

import { useMemo, useState, type CSSProperties } from "react";
import styles from "./SupplyNavPrototype.module.css";

type PrimaryTabId = "punch" | "board" | "coffee" | "calendar" | "report" | "supply";
type SupplyTabId = "status" | "shop" | "taskRecord" | "backpack" | "drawPool";

type PrimaryTab = {
  id: PrimaryTabId;
  label: string;
  icon: string;
};

type SupplyTab = {
  id: SupplyTabId;
  label: string;
  icon: string;
  accent: string;
  summary: string;
  image: string;
};

const primaryTabs: PrimaryTab[] = [
  { id: "punch", label: "健身打卡", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_workout_pixel.svg" },
  { id: "board", label: "共享看板", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_board_pixel.svg" },
  { id: "coffee", label: "续命咖啡", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_coffee_pixel.svg" },
  { id: "calendar", label: "牛马日历", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_calendar_pixel.svg" },
  { id: "report", label: "战报中心", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_report_pixel.svg" },
  { id: "supply", label: "牛马补给站", icon: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_supply_pixel.svg" },
];

const supplyTabs: SupplyTab[] = [
  {
    id: "status",
    label: "我的状态",
    icon: "⌂",
    accent: "#fde047",
    summary: "今日主线 3/4，连续打卡 12 天",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_niuma_hero_clean.webp",
  },
  {
    id: "shop",
    label: "补给商店",
    icon: "▤",
    accent: "#7dd3fc",
    summary: "限时道具 6 件，训练日志可兑换",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_shop_training_log.webp",
  },
  {
    id: "taskRecord",
    label: "任务记录",
    icon: "▣",
    accent: "#86efac",
    summary: "今日完成 3 项，本周累计 19 项",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_menu_menu_today.png",
  },
  {
    id: "backpack",
    label: "背包",
    icon: "◫",
    accent: "#fca5a5",
    summary: "12 件道具，2 张保护券待使用",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_backpack_backpack_dumbbell.webp",
  },
  {
    id: "drawPool",
    label: "抽奖池",
    icon: "◈",
    accent: "#c4b5fd",
    summary: "奖池刷新中，10 连抽还差 3 张券",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/draw-pool-machine.webp",
  },
];

const assetChips = [
  {
    id: "coins",
    label: "银子",
    value: "440",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_coins.png",
  },
  {
    id: "ticket",
    label: "抽奖券",
    value: "7",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_ticket.png",
  },
  {
    id: "backpack",
    label: "背包",
    value: "12",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_backpack.png",
  },
];

const taskRows = [
  { title: "工位重启", meta: "肩颈开机 8 分钟", state: "已完成", tone: "done" },
  { title: "无糖信仰", meta: "喝水 500ml", state: "进行中", tone: "live" },
  { title: "夸夸回血", meta: "给队友发射鼓励", state: "待开始", tone: "idle" },
];

export default function SupplyNavPrototypePage() {
  const [activeSupplyTab, setActiveSupplyTab] = useState<SupplyTabId>("status");
  const activeSupply = useMemo(
    () => supplyTabs.find((tab) => tab.id === activeSupplyTab) ?? supplyTabs[0],
    [activeSupplyTab],
  );

  return (
    <main className={styles.prototype}>
      <section className={styles.shell} aria-label="共享导航壳补给站原型">
        <nav className={styles.topNav} aria-label="脱脂牛马主导航">
          <a className={styles.brand} href="/dashboard/status" aria-label="脱脂牛马">
            <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_logo.png" alt="" />
            <span>脱脂牛马</span>
          </a>

          <div className={styles.primaryTabs} role="tablist" aria-label="主站栏目">
            {primaryTabs.map((tab) => {
              const isActive = tab.id === "supply";

              return (
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? styles.primaryTabActive : styles.primaryTab}
                  href={tab.id === "supply" ? "/dashboard/status" : "#"}
                  key={tab.id}
                >
                  <img src={tab.icon} alt="" />
                  <span>{tab.label}</span>
                </a>
              );
            })}
          </div>

          <div className={styles.contextSlot} aria-label="补给站资产">
            <button className={styles.bell} type="button" aria-label="团队动态，未读 4 条">
              <span aria-hidden="true">!</span>
              <b>4</b>
            </button>
            <div className={styles.assets}>
              {assetChips.map((asset) => (
                <button className={styles.assetChip} key={asset.id} type="button" aria-label={`${asset.label} ${asset.value}`}>
                  <img src={asset.image} alt="" />
                  <em>{asset.label}</em>
                  <strong>{asset.value}</strong>
                </button>
              ))}
            </div>
            <button className={styles.profile} type="button" aria-label="li 的用户菜单">
              <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png" alt="" />
              <span>li</span>
            </button>
          </div>
        </nav>

        <div className={styles.secondaryDock} aria-label="牛马补给站分区导航">
          <div className={styles.secondaryRail} role="tablist">
            {supplyTabs.map((tab) => {
              const isActive = tab.id === activeSupplyTab;

              return (
                <button
                  aria-selected={isActive}
                  className={isActive ? styles.secondaryTabActive : styles.secondaryTab}
                  key={tab.id}
                  onClick={() => setActiveSupplyTab(tab.id)}
                  role="tab"
                  style={{ "--tab-accent": tab.accent } as CSSProperties}
                  type="button"
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <strong>{tab.label}</strong>
                </button>
              );
            })}
          </div>
        </div>

        <section
          className={styles.supplyStage}
          style={{ "--active-accent": activeSupply.accent } as CSSProperties}
          aria-label={`${activeSupply.label}内容`}
        >
          <div className={styles.stageBackdrop} aria-hidden="true">
            <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dashboard_gym_bg.webp" alt="" />
          </div>

          <div className={styles.statusColumn}>
            <article className={styles.vaultPanel}>
              <span className={styles.panelPin} aria-hidden="true" />
              <div>
                <img src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_vault_safe.webp" alt="" />
              </div>
              <section>
                <h1>{activeSupply.label}</h1>
                <p>{activeSupply.summary}</p>
                <div className={styles.progressTrack} aria-label="本期团队冲刺进度 7/120">
                  <span />
                </div>
                <footer>
                  <strong>7/120</strong>
                  <em>本期团队冲刺</em>
                </footer>
              </section>
            </article>

            <div className={styles.metricsGrid} aria-label="今日状态">
              <article>
                <span>银子</span>
                <strong>440</strong>
                <em>个人长期累计资产</em>
              </article>
              <article>
                <span>抽奖券</span>
                <strong>7</strong>
                <em>距离十连还差 3 张</em>
              </article>
              <article>
                <span>背包</span>
                <strong>12</strong>
                <em>2 件今日可使用</em>
              </article>
            </div>
          </div>

          <div className={styles.heroColumn}>
            <div className={styles.heroHalo} aria-hidden="true" />
            <img className={styles.heroImage} src={activeSupply.image} alt="" />
            <div className={styles.heroStatus}>
              <strong>Lv.12</strong>
              <span>EXP 2185 / 2600</span>
            </div>
          </div>

          <aside className={styles.questPanel} aria-label="今日主线">
            <header>
              <h2>今日主线</h2>
              <strong>3/4</strong>
            </header>
            <div className={styles.taskList}>
              {taskRows.map((task) => (
                <article className={styles.taskRow} data-tone={task.tone} key={task.title}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{task.title}</strong>
                    <em>{task.meta}</em>
                  </div>
                  <b>{task.state}</b>
                </article>
              ))}
            </div>
            <button className={styles.claimButton} type="button">
              领取今日补给
            </button>
          </aside>
        </section>
      </section>
    </main>
  );
}
