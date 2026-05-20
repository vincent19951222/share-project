import { supplyUiLabResources } from "../supply-data/resources";
import {
  supplyUiLabDrawHistory,
  supplyUiLabRadarInvites,
  supplyUiLabRecordDates,
  supplyUiLabRecordRules,
  supplyUiLabRecordsByDate,
  supplyUiLabRedemptions,
} from "../supply-data/records";
import type { SupplyTaskRecordPreview } from "./types";

export const supplyTaskRecordAssetPaths = {
  profileAvatar: "/avatars/male1.png",
  avatars: {
    sailor: "/avatars/male2.png",
    deer: "/avatars/female1.png",
    runner: "/avatars/male3.png",
  },
  sidebar: {
    background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
    hero: "/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp",
  },
  rewardIcons: {
    coins: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
  },
} as const;

export const supplyTaskRecordMock: SupplyTaskRecordPreview = {
  activeMode: "today",
  activeDateKey: supplyUiLabRecordDates[0]?.key ?? "2026-05-18",
  dates: supplyUiLabRecordDates,
  recordsByDate: supplyUiLabRecordsByDate,
  drawHistory: supplyUiLabDrawHistory,
  rules: supplyUiLabRecordRules,
  topBar: {
    resources: supplyUiLabResources.dashboard,
    profile: {
      username: "Vincent",
      avatar: supplyTaskRecordAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    menuItems: [
      { id: "today", label: "今日记录", icon: "▤" },
      { id: "draws", label: "抽卡记录", icon: "▥" },
      { id: "redemptions", label: "兑换记录", icon: "券" },
      { id: "radar", label: "队友雷达", icon: "●●" },
      { id: "rules", label: "规则说明", icon: "册" },
    ],
    backHref: "/ui-lab/supply-dashboard",
    mascot: {
      background: supplyTaskRecordAssetPaths.sidebar.background,
      hero: supplyTaskRecordAssetPaths.sidebar.hero,
    },
  },
  filters: [
    { id: "all", label: "全部", active: true },
    { id: "mainline", label: "主线任务", active: false },
    { id: "social", label: "社交互动", active: false },
    { id: "reward", label: "奖励领取", active: false },
    { id: "system", label: "系统通知", active: false },
  ],
  radar: {
    tabs: [
      { id: "pending", label: "待响应 (3)", active: true },
      { id: "responded", label: "已回应", active: false },
      { id: "expired", label: "已过期", active: false },
    ],
    invites: supplyUiLabRadarInvites,
  },
  redemptions: {
    items: supplyUiLabRedemptions,
  },
};
