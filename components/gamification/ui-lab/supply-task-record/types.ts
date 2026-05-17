export type SupplyTaskRecordResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type SupplyTaskRecordMenuItem = {
  id: "today" | "draws" | "redemptions" | "radar" | "rules";
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyTaskRecordFilter = {
  id: "all" | "mainline" | "social" | "reward" | "system";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordTimelineCategory = "mainline" | "social" | "reward" | "draw" | "system";
export type SupplyTaskRecordTimelineStatus = "completed" | "claimed";

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
  reward: {
    icon: string;
    label: string;
    amount: string;
  };
  status: SupplyTaskRecordTimelineStatus;
  statusLabel: string;
};

export type SupplyTaskRecordRadarTab = {
  id: "pending" | "responded" | "expired";
  label: string;
  active: boolean;
};

export type SupplyTaskRecordInvite = {
  id: string;
  avatar: string;
  name: string;
  message: string;
  timeLabel: string;
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
  topBar: {
    resources: SupplyTaskRecordResource[];
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
  day: {
    label: string;
    dateLabel: string;
    weekday: string;
  };
  timelineRecords: SupplyTaskRecordTimelineItem[];
  radar: {
    tabs: SupplyTaskRecordRadarTab[];
    invites: SupplyTaskRecordInvite[];
  };
  redemptions: {
    items: SupplyTaskRecordRedemption[];
  };
};
