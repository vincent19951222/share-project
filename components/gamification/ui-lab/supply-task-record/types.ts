import type { SupplyUiLabResource } from "../supply-data/types";

export type SupplyTaskRecordMode = "today" | "draws" | "redemptions" | "radar" | "rules";

export type SupplyTaskRecordMenuItem = {
  id: SupplyTaskRecordMode;
  label: string;
  iconImage: string;
};

export type SupplyTaskRecordFilter = {
  id: "all" | "mainline" | "social" | "reward" | "system";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordTimelineCategory = "mainline" | "social" | "reward" | "draw" | "system";
export type SupplyTaskRecordTimelineStatus = "completed" | "claimed";

export type SupplyTaskRecordDateOption = {
  key: string;
  label: string;
  dateLabel: string;
  weekday: string;
};

export type SupplyTaskRecordTimelineItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  category: SupplyTaskRecordTimelineCategory;
  categoryLabel: string;
  categoryTone: "green" | "orange";
  icon: {
    type: "text" | "image";
    value: string;
    alt: string;
  };
  reward?: {
    icon: string;
    label: string;
    amount: string;
  };
  status: SupplyTaskRecordTimelineStatus;
  statusLabel: string;
};

export type SupplyTaskRecordDrawHistoryItem = {
  id: string;
  drawType: "单抽" | "十连";
  time: string;
  ticketSpent: number;
  guaranteeApplied: boolean;
  guaranteeLabel: string;
  rewards: Array<{ name: string; quantityLabel: string; rarity: string }>;
};

export type SupplyTaskRecordRadarStatus = "pending" | "responded" | "expired" | "ignored";

export type SupplyTaskRecordRadarTab = {
  id: SupplyTaskRecordRadarStatus;
  label: string;
  active: boolean;
};

export type SupplyTaskRecordInvite = {
  id: string;
  avatar: string;
  name: string;
  message: string;
  timeLabel: string;
  status: SupplyTaskRecordRadarStatus;
  statusLabel: string;
};

export type SupplyTaskRecordRedemption = {
  id: string;
  icon: string;
  title: string;
  requestedAt: string;
  secondaryLabel: string;
  status: "processing" | "completed" | "expired";
  statusLabel: string;
};

export type SupplyTaskRecordPreview = {
  activeMode: SupplyTaskRecordMode;
  activeDateKey: string;
  dates: SupplyTaskRecordDateOption[];
  recordsByDate: Record<string, SupplyTaskRecordTimelineItem[]>;
  drawHistory: SupplyTaskRecordDrawHistoryItem[];
  rules: string[];
  topBar: {
    resources: SupplyUiLabResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  sidebar: {
    menuItems: SupplyTaskRecordMenuItem[];
    backHref: string;
    mascot: {
      background: string;
      hero: string;
    };
  };
  filters: SupplyTaskRecordFilter[];
  radar: {
    tabs: SupplyTaskRecordRadarTab[];
    invites: SupplyTaskRecordInvite[];
  };
  redemptions: {
    items: SupplyTaskRecordRedemption[];
  };
};
