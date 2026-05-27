import { supplyUiLabResources } from "../supply-data/resources";
import {
  supplyUiLabDrawHistory,
  supplyUiLabRadarInvites,
  supplyUiLabRecordDates,
  supplyUiLabRecordRules,
  supplyUiLabRecordsByDate,
  supplyUiLabRedemptions,
} from "../supply-data/records";
import { supplyTaskRecordAssetPaths } from "./assets";
import type { SupplyTaskRecordPreview } from "./types";

export { supplyTaskRecordAssetPaths };

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
      { id: "today", label: "今日记录", iconImage: supplyTaskRecordAssetPaths.menuIcons.today },
      { id: "draws", label: "抽卡记录", iconImage: supplyTaskRecordAssetPaths.menuIcons.draws },
      { id: "redemptions", label: "兑换记录", iconImage: supplyTaskRecordAssetPaths.menuIcons.redemptions },
      { id: "radar", label: "队友雷达", iconImage: supplyTaskRecordAssetPaths.menuIcons.radar },
      { id: "rules", label: "规则说明", iconImage: supplyTaskRecordAssetPaths.menuIcons.rules },
    ],
    backHref: "/dashboard/status",
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
