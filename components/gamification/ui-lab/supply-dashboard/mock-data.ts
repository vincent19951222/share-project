import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyDashboardPreview, SupplyDashboardResource } from "./types";

export const supplyDashboardAssetPaths = {
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  hero: "/assets/home-scenes/supply/dashboard/niuma-hero.webp",
  levelAvatar: "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
  dockBackpack: "/assets/home-scenes/supply/dashboard/dock-backpack.webp",
  dockSupplyMachine: "/assets/home-scenes/supply/dashboard/dock-supply-machine.webp",
  dockTaskRecord: "/assets/home-scenes/supply/dashboard/dock-task-record.webp",
  fallbackLogo: "/logo.png",
  taskCards: {
    hydration: "/assets/task-cards/raw/hydration_003%C2%A0%E6%9D%AF%E5%AD%90%E8%A7%81%E5%BA%95.png",
    movement: "/assets/task-cards/raw/movement_004%C2%A0%E7%AA%97%E8%BE%B9%E5%9B%9E%E8%A1%80.png",
    social: "/assets/task-cards/raw/social_001%C2%A0%E5%BA%9F%E8%AF%9D%20KPI.png",
    learning: "/assets/task-cards/raw/learning_005%C2%A0%E4%B8%80%E5%8F%A5%E8%AF%9D%E7%AC%94%E8%AE%B0.png",
  },
  rewardIcons: {
    coin: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
  },
} as const;

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
    avatar: "/avatars/male1.png",
    title: "自律牛马",
    level: 28,
    totalExp: 27720,
    currentLevelExp: 720,
    nextLevelExp: 1000,
    streakDays: 18,
  },
  motto: "不是在健身，就是在去健身的路上！",
  resources: supplyUiLabResources.dashboard.map(toDashboardResource),
  activeEffects: supplyUiLabActiveEffects,
  dailyQuests: [
    {
      id: "movement_004",
      dimension: "movement",
      title: "窗边回血",
      subtitle: "把电充绿",
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
      href: "/ui-lab/supply-dashboard",
      title: "首页",
      subtitle: "查看你的今日状态",
      badge: "",
      image: null,
    },
    {
      id: "backpack",
      href: "/ui-lab/supply-dashboard/backpack",
      title: "背包",
      subtitle: "查看全部道具",
      badge: "18/60",
      image: supplyDashboardAssetPaths.dockBackpack,
    },
    {
      id: "draw-pool",
      href: "/ui-lab/supply-dashboard/draw-pool",
      title: "补给站",
      subtitle: "随机获取道具、银子或真实福利！",
      badge: "999/999",
      image: supplyDashboardAssetPaths.dockSupplyMachine,
    },
    {
      id: "task-record",
      href: "/ui-lab/supply-dashboard/task-record",
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
    message: "团队公告：周六早上 8 点公园团练，记得来哦！",
  },
};
