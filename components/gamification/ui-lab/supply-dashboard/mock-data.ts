import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
import { supplyDashboardAssetPaths } from "./assets";
import type { SupplyDashboardPreview, SupplyDashboardResource } from "./types";

export { supplyDashboardAssetPaths };

export const DEFAULT_SUPPLY_DASHBOARD_MOTTO = "不是在健身，就是在去健身的路上！";
export const DEFAULT_SUPPLY_DASHBOARD_TEAM_ANNOUNCEMENT = "团队公告：周六早上 8 点公园团练，记得来哦！";

function toDashboardResource(resource: {
  id: string;
  label: string;
  value: string;
  icon: string;
  iconImage?: string;
}): SupplyDashboardResource {
  const [currentValue, maxValue] = resource.value.split("/");

  return {
    id: resource.id as SupplyDashboardResource["id"],
    label: resource.label,
    value: Number(currentValue.replace(/,/g, "")),
    maxValue: maxValue === undefined ? undefined : Number(maxValue.replace(/,/g, "")),
    icon: resource.icon,
    iconImage: resource.iconImage,
  };
}

export const supplyDashboardMock: SupplyDashboardPreview = {
  profile: {
    username: "Vincent",
    avatar: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png",
    title: "自律牛马",
    level: 1,
    totalExp: 0,
    currentLevelExp: 0,
    nextLevelExp: 1000,
    streakDays: 18,
  },
  motto: DEFAULT_SUPPLY_DASHBOARD_MOTTO,
  resources: supplyUiLabResources.dashboard.map(toDashboardResource),
  activeEffects: supplyUiLabActiveEffects,
  dailyQuests: [
    {
      id: "movement_004",
      dimension: "movement",
      title: "窗边回血",
      subtitle: "把电充绿",
      description: "走到窗边或户外看远处 30 秒，顺便深呼吸几口。",
      image: supplyDashboardAssetPaths.taskCards.movement,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "4天",
      completed: true,
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    },
    {
      id: "hydration_003",
      dimension: "hydration",
      title: "杯子见底",
      subtitle: "把尿喝白",
      description: "把当前杯子里的水喝到见底，给水杯一个交代。",
      image: supplyDashboardAssetPaths.taskCards.hydration,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "2天",
      completed: true,
      reward: {
        icon: "🪙",
        label: "银子",
        amount: 20,
      },
    },
    {
      id: "social_001",
      dimension: "social",
      title: "废话 KPI",
      subtitle: "把事办黄",
      description: "和同事聊两句无关工作的废话，完成今日人类连接。",
      image: supplyDashboardAssetPaths.taskCards.social,
      difficulty: "轻",
      tags: ["办公室"],
      durationLabel: "3天",
      completed: true,
      reward: {
        icon: "券",
        label: "抽奖券",
        amount: 1,
      },
    },
    {
      id: "learning_005",
      dimension: "learning",
      title: "一句话笔记",
      subtitle: "把股看红",
      description: "把今天学到的一个东西写成一句话，短到能发群里最好。",
      image: supplyDashboardAssetPaths.taskCards.learning,
      difficulty: "中",
      tags: ["通用"],
      durationLabel: "4天",
      completed: false,
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    },
  ],
  shortcutLinks: [
    {
      id: "home",
      href: "/dashboard/status",
      title: "首页",
      subtitle: "查看你的今日状态",
      badge: "",
      image: supplyDashboardAssetPaths.dockHome,
    },
    {
      id: "backpack",
      href: "/dashboard/backpack",
      title: "背包",
      subtitle: "查看全部道具",
      badge: "18/60",
      image: supplyDashboardAssetPaths.dockBackpack,
    },
    {
      id: "draw-pool",
      href: "/dashboard/cards",
      title: "抽奖池",
      subtitle: "随机获取道具、银子或真实福利！",
      badge: "999/999",
      image: supplyDashboardAssetPaths.dockSupplyMachine,
    },
    {
      id: "task-record",
      href: "/dashboard/quest",
      title: "任务记录",
      subtitle: "查看历史任务与奖励",
      badge: "",
      image: supplyDashboardAssetPaths.dockTaskRecord,
    },
  ],
  inventoryPreview: {
    usedSlots: 18,
    totalSlots: 60,
    items: [
      {
        id: "water",
        name: "水瓶",
        icon: "💧",
        quantity: 12,
      },
      {
        id: "shoe",
        name: "跑鞋",
        icon: "👟",
        quantity: 1,
      },
      {
        id: "heart",
        name: "回血",
        icon: "❤",
        quantity: 6,
      },
    ],
  },
  supplyPreview: {
    remainingDraws: 999,
    maxDraws: 999,
    featuredRewards: [
      {
        id: "ticket",
        name: "抽奖券",
        icon: "券",
        quantity: 1,
      },
      {
        id: "water",
        name: "水瓶",
        icon: "💧",
        quantity: 1,
      },
      {
        id: "exp",
        name: "经验",
        icon: "EXP",
        quantity: 1,
      },
    ],
  },
  announcement: {
    message: DEFAULT_SUPPLY_DASHBOARD_TEAM_ANNOUNCEMENT,
  },
};
