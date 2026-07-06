import { supplyBackpackAssetPaths } from "@/components/gamification/ui-lab/supply-backpack/assets";
import { getSupplyDisplayResources } from "@/lib/gamification/supply-display-resources";
import type {
  SupplyBackpackCategory,
  SupplyBackpackCategoryId,
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackSelectedDetail,
  SupplyBackpackSlot,
} from "@/components/gamification/ui-lab/supply-backpack/types";
import { supplyDashboardAssetPaths } from "@/components/gamification/ui-lab/supply-dashboard/assets";
import type {
  SupplyDashboardPreview,
  SupplyDashboardResource,
} from "@/components/gamification/ui-lab/supply-dashboard/types";
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
import type {
  SupplyUiLabActiveEffect,
  SupplyUiLabCatalogCategory,
  SupplyUiLabCatalogRarity,
  SupplyUiLabDrawTier,
  SupplyUiLabResource,
  SupplyUiLabUseTiming,
} from "@/components/gamification/ui-lab/supply-data/types";
import {
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabCategoryIcons } from "@/components/gamification/ui-lab/supply-data/category-icons";
import { supplyDrawPoolAssetPaths } from "@/components/gamification/ui-lab/supply-draw-pool/assets";
import type {
  SupplyDrawPoolPreview,
  SupplyDrawPoolRateTier,
  SupplyDrawPoolRewardRow,
} from "@/components/gamification/ui-lab/supply-draw-pool/types";
import { supplyShopAssetPaths } from "@/components/gamification/ui-lab/supply-shop/assets";
import type {
  SupplyShopCategory,
  SupplyShopCategoryId,
  SupplyShopFilter,
  SupplyShopPreview,
  SupplyShopProduct,
  SupplyShopProductDetail,
  SupplyShopRedeemState,
} from "@/components/gamification/ui-lab/supply-shop/types";
import { supplyTaskRecordAssetPaths } from "@/components/gamification/ui-lab/supply-task-record/assets";
import type {
  SupplyTaskRecordFilter,
  SupplyTaskRecordInvite,
  SupplyTaskRecordPreview,
  SupplyTaskRecordRadarStatus,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineCategory,
  SupplyTaskRecordTimelineItem,
} from "@/components/gamification/ui-lab/supply-task-record/types";
import type {
  GamificationBackpackCategory,
  GamificationBackpackItemSnapshot,
  GamificationLotteryDrawSnapshot,
  GamificationLotteryRewardSnapshot,
  GamificationTodayEffectSnapshot,
  SocialInvitationSnapshot,
  SocialRecipientSnapshot,
  SupplyShopProductSnapshot,
  SupplyStationProductionSnapshot,
  SupplyTaskRecordSnapshot,
} from "@/lib/types";
import { getAvatarUrl } from "@/lib/avatars";

const BACKPACK_PAGE_SIZE = 20;
const DIRECT_SOCIAL_ITEM_IDS = new Set([
  "drink_water_ping",
  "walk_ping",
  "chat_ping",
  "share_info_ping",
]);

const categoryLabels = {
  boost: "增益",
  protection: "防护",
  social: "社交",
  task: "任务",
  real_world: "真实福利",
} satisfies Record<SupplyUiLabCatalogCategory, string>;

const shopCategoryMeta = {
  all: { label: "全部商品", icon: "▦", iconImage: supplyUiLabCategoryIcons.all },
  boost: { label: "增益道具", icon: "▲", iconImage: supplyUiLabCategoryIcons.boost },
  protection: { label: "防护道具", icon: "◆", iconImage: supplyUiLabCategoryIcons.protection },
  social: { label: "社交道具", icon: "✦", iconImage: supplyUiLabCategoryIcons.social },
  task: { label: "任务道具", icon: "▣", iconImage: supplyUiLabCategoryIcons.task },
  real_world: { label: "真实福利", icon: "★", iconImage: supplyUiLabCategoryIcons.real_world },
} satisfies Record<SupplyShopCategoryId, { label: string; icon: string; iconImage: string }>;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatResourceValue(value: number, maxValue?: number) {
  return maxValue === undefined ? formatNumber(value) : `${formatNumber(value)}/${formatNumber(maxValue)}`;
}

function avatarPath(avatarKey: string) {
  return getAvatarUrl(avatarKey);
}

function getResources(snapshot: SupplyStationProductionSnapshot): SupplyUiLabResource[] {
  return getSupplyDisplayResources(snapshot).map((resource) => {
    const id = resource.id;
    return {
      id,
      label: resource.label,
      value: formatResourceValue(resource.value, resource.maxValue),
      icon: id === "coins" ? "◎" : id === "ticket" ? "券" : "包",
      iconImage: supplyUiLabResourceIconPaths[id],
    };
  });
}

function getDashboardResources(snapshot: SupplyStationProductionSnapshot): SupplyDashboardResource[] {
  return getSupplyDisplayResources(snapshot).map((resource) => {
    const id = resource.id;
    return {
      id,
      label: resource.label,
      value: resource.value,
      maxValue: resource.maxValue,
      icon: id === "coins" ? "◎" : id === "ticket" ? "券" : "包",
      iconImage: supplyUiLabResourceIconPaths[id],
    };
  });
}

function mapTodayEffect(effect: GamificationTodayEffectSnapshot): SupplyUiLabActiveEffect {
  const catalogItem = supplyUiLabCatalog.find((item) => item.sourceItemId === effect.itemId);

  return {
    id: effect.id,
    sourceItemId: effect.itemId,
    label: effect.name,
    effectSummary: effect.effectSummary,
    businessSource: "production",
    status: effect.status === "PENDING" ? "pending" : effect.status === "EXPIRED" ? "expired" : "active",
    statusLabel: effect.status === "PENDING" ? "今日待生效" : effect.status === "EXPIRED" ? "已过期" : "今日已生效",
    endsAtLabel: effect.settledAt ? formatDateTime(effect.settledAt) : "今日 23:59",
    icon: catalogItem?.media.image ?? supplyDashboardAssetPaths.rewardIcons.boost,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function mapBackpackCategory(category: GamificationBackpackCategory): Exclude<SupplyBackpackCategoryId, "all"> {
  if (category === "social") {
    return "social";
  }

  if (category === "task" || category === "lottery") {
    return "task";
  }

  if (category === "real_world") {
    return "real";
  }

  return "boost";
}

function mapCatalogCategory(category: GamificationBackpackCategory): SupplyUiLabCatalogCategory {
  if (
    category === "boost" ||
    category === "protection" ||
    category === "social" ||
    category === "task" ||
    category === "real_world"
  ) {
    return category;
  }

  return "boost";
}

function getCatalogItem(id: string) {
  return supplyUiLabCatalog.find((item) => item.sourceItemId === id || item.sourceRewardId === id);
}

function getItemImage(itemId: string, category: GamificationBackpackCategory) {
  const catalogItem = getCatalogItem(itemId);

  if (catalogItem) {
    return catalogItem.media.image;
  }

  if (category === "social") {
    return supplyBackpackAssetPaths.socialTicket;
  }

  if (category === "real_world") {
    return supplyBackpackAssetPaths.riceBall;
  }

  return supplyBackpackAssetPaths.dumbbell;
}

function getItemRarity(itemId: string): SupplyUiLabCatalogRarity {
  return getCatalogItem(itemId)?.rarity ?? "R";
}

function getItemUseTiming(item: GamificationBackpackItemSnapshot): SupplyUiLabUseTiming {
  if (item.useTiming === "manual_redemption") {
    return "manual_redemption";
  }

  if (item.useTiming === "today") {
    return "today";
  }

  return "instant";
}

function buildRestrictions(item: GamificationBackpackItemSnapshot) {
  return [
    item.usageLimitSummary,
    item.useDisabledReason,
    item.requiresAdminConfirmation ? "真实福利需管理员确认后发放" : null,
  ].filter((restriction): restriction is string => Boolean(restriction));
}

function getAllBackpackItems(snapshot: SupplyStationProductionSnapshot) {
  return snapshot.backpack.groups.flatMap((group) => group.items);
}

function getEmptyBackpackDetail(snapshot: SupplyStationProductionSnapshot): SupplyBackpackSelectedDetail {
  return {
    itemId: "__empty",
    name: "空背包",
    rarity: "N",
    tag: "暂无",
    ownedQuantity: 0,
    image: supplyBackpackAssetPaths.banana,
    description: snapshot.backpack.emptyMessage,
    effect: "完成任务或抽卡后会出现在这里。",
    useTiming: "暂无可用道具",
    restrictions: ["暂无库存"],
    primaryAction: "今日使用",
    secondaryAction: "去商店",
    actionState: "unavailable",
    resultPreview: "背包为空时不会触发任何生产操作。",
    shopCta: {
      label: "去商店",
      href: "/dashboard/store",
      description: "前往补给商店查看可购买道具",
    },
    requiresAdminConfirmation: false,
  };
}

function toBackpackDetail(
  item: GamificationBackpackItemSnapshot,
  socialTargets: SocialRecipientSnapshot[],
): SupplyBackpackSelectedDetail {
  const actionState = item.requiresAdminConfirmation
    ? "admin"
    : !item.useEnabled || item.availableQuantity <= 0
      ? "unavailable"
      : "usable";
  const requiresSocialTarget = DIRECT_SOCIAL_ITEM_IDS.has(item.itemId);

  return {
    itemId: item.itemId,
    name: item.name,
    rarity: getItemRarity(item.itemId),
    tag: item.categoryLabel,
    ownedQuantity: item.quantity,
    image: getItemImage(item.itemId, item.category),
    description: item.description,
    effect: item.effectSummary,
    useTiming: item.useTimingLabel,
    restrictions: buildRestrictions(item),
    primaryAction: item.requiresAdminConfirmation ? "申请使用" : "今日使用",
    secondaryAction: item.requiresAdminConfirmation ? "申请兑换" : "去商店",
    actionState,
    resultPreview: item.requiresAdminConfirmation
      ? "提交后进入管理员确认流程。"
      : item.useEnabled
        ? "使用后将进入今日效果，并刷新真实库存。"
        : item.useDisabledReason ?? "当前不可使用。",
    shopCta: {
      label: "去商店",
      href: "/dashboard/store",
      description: "前往补给商店查看同源道具与兑换入口",
    },
    requiresAdminConfirmation: item.requiresAdminConfirmation,
    redemptionStateLabel: item.requiresAdminConfirmation ? "等待管理员确认" : undefined,
    socialTargets: requiresSocialTarget ? socialTargets : undefined,
  };
}

function toInventoryItem(
  item: GamificationBackpackItemSnapshot,
  selectedItemId?: string | null,
): SupplyBackpackInventoryItem {
  return {
    id: item.itemId,
    name: item.name,
    image: getItemImage(item.itemId, item.category),
    rarity: getItemRarity(item.itemId),
    categoryId: mapBackpackCategory(item.category),
    quantity: item.quantity,
    selected: selectedItemId ? item.itemId === selectedItemId : false,
  };
}

function getLimitLabel(product: SupplyShopProductSnapshot) {
  if (product.dailyLimit !== undefined) {
    return `每天限购${formatNumber(product.dailyLimit)}次`;
  }

  if (product.weeklyLimit !== undefined) {
    return `每周限购${formatNumber(product.weeklyLimit)}次`;
  }

  return "不限购";
}

function getRedeemState(snapshot: SupplyStationProductionSnapshot, product: SupplyShopProductSnapshot): SupplyShopRedeemState {
  if (product.requiresAdminConfirmation) {
    return "adminConfirmation";
  }

  if (!product.purchaseEnabled && product.purchaseDisabledReason) {
    return "limitReached";
  }

  if (snapshot.resources.coins.value < product.priceCoins) {
    return "insufficient";
  }

  return "available";
}

function mapRewardTier(reward: GamificationLotteryRewardSnapshot): SupplyDrawPoolRateTier {
  if (reward.rewardKind === "coins" || reward.rewardTier === "coin") {
    return "coin";
  }

  if (reward.rewardTier === "social" || reward.rewardTier === "rare" || reward.rewardTier === "utility") {
    return reward.rewardTier as SupplyUiLabDrawTier;
  }

  return getCatalogItem(reward.rewardId)?.drawPool.tier ?? "utility";
}

function mapRewardRarity(reward: GamificationLotteryRewardSnapshot): SupplyUiLabCatalogRarity {
  if (reward.rewardKind === "coins" || reward.rewardTier === "coin") {
    return "N";
  }

  return getCatalogItem(reward.rewardId)?.rarity ?? "R";
}

function getRewardImage(reward: GamificationLotteryRewardSnapshot) {
  const coinRow = SUPPLY_UI_LAB_COIN_REWARD_ROWS.find((row) => row.rewardId === reward.rewardId);

  return coinRow?.image ?? getCatalogItem(reward.rewardId)?.media.image ?? supplyDashboardAssetPaths.rewardIcons.boost;
}

function toRewardRow(reward: GamificationLotteryRewardSnapshot, index: number): SupplyDrawPoolRewardRow {
  const isCoin = reward.rewardKind === "coins" || reward.rewardTier === "coin";

  return {
    id: `${reward.rewardId}-${index}`,
    tier: mapRewardTier(reward),
    rarity: mapRewardRarity(reward),
    name: reward.name,
    quantityLabel: isCoin ? reward.effectSummary : "x1",
    image: getRewardImage(reward),
  };
}

function getRecentDrawRows(draws: GamificationLotteryDrawSnapshot[]) {
  return draws.flatMap((draw) => draw.rewards.map(toRewardRow)).slice(0, 8);
}

function mapTimelineCategory(
  category: SupplyTaskRecordSnapshot["timeline"][number]["category"],
): SupplyTaskRecordTimelineCategory {
  if (category === "task") {
    return "mainline";
  }

  if (category === "social") {
    return "social";
  }

  if (category === "draw") {
    return "draw";
  }

  return category === "redemption" ? "system" : "reward";
}

function getTimelineCategoryLabel(category: SupplyTaskRecordTimelineCategory) {
  const labels: Record<SupplyTaskRecordTimelineCategory, string> = {
    draw: "抽卡",
    mainline: "主线任务",
    reward: "奖励",
    social: "社交",
    system: "系统",
  };

  return labels[category];
}

function toTimelineItem(row: SupplyTaskRecordSnapshot["timeline"][number]): SupplyTaskRecordTimelineItem {
  const category = mapTimelineCategory(row.category);

  return {
    id: row.id,
    time: formatDateTime(row.occurredAt),
    title: row.title,
    subtitle: row.subtitle,
    category,
    categoryLabel: getTimelineCategoryLabel(category),
    categoryTone: category === "mainline" || category === "social" ? "green" : "orange",
    icon: {
      type: "image",
      value: category === "mainline"
        ? supplyTaskRecordAssetPaths.menuIcons.today
        : category === "draw"
          ? supplyTaskRecordAssetPaths.menuIcons.draws
          : supplyTaskRecordAssetPaths.menuIcons.redemptions,
      alt: row.title,
    },
    reward: category === "draw" ? { icon: "券", label: "抽卡", amount: "" } : undefined,
    status: category === "reward" || category === "draw" ? "claimed" : "completed",
    statusLabel: row.statusLabel,
  };
}

function toRadarStatus(status: SocialInvitationSnapshot["status"]): SupplyTaskRecordRadarStatus {
  if (status === "RESPONDED") {
    return "responded";
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return "expired";
  }

  return "pending";
}

function toRadarInvite(invite: SocialInvitationSnapshot): SupplyTaskRecordInvite {
  const status = toRadarStatus(invite.status);

  return {
    id: invite.id,
    avatar: supplyTaskRecordAssetPaths.avatars.runner,
    name: invite.senderUsername ?? invite.recipientUsername ?? "队友",
    message: invite.message,
    timeLabel: formatDateTime(invite.createdAt),
    status,
    statusLabel: status === "pending" ? "待响应" : status === "responded" ? "已回应" : "已过期",
  };
}

function getSocialInvitationActionLabel(invitationType: string) {
  if (invitationType === "DRINK_WATER") {
    return "喝水";
  }

  if (invitationType === "WALK_AROUND") {
    return "走一走";
  }

  return "互动";
}

function getSocialInvitationNotice(snapshot: SupplyStationProductionSnapshot) {
  const pendingCount = snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount;
  const latest = [...snapshot.social.received, ...snapshot.social.teamWide].find(
    (invite) => invite.status === "PENDING",
  );

  if (pendingCount <= 0 || !latest) {
    return undefined;
  }

  return {
    pendingCount,
    title: "队友邀请待响应",
    message: `${latest.senderUsername ?? "队友"} 邀请你${getSocialInvitationActionLabel(latest.invitationType)}：${latest.message}`,
    actionLabel: "去回应",
    target: "task-record" as const,
  };
}

export function toSupplyDashboardPreview(snapshot: SupplyStationProductionSnapshot): SupplyDashboardPreview {
  const displayResources = getSupplyDisplayResources(snapshot);
  const ticketResource = displayResources.find((resource) => resource.id === "ticket");
  const completedQuestCount = snapshot.dashboard.dailyQuests.filter(
    (dimension) => dimension.assignment?.status === "completed",
  ).length;
  const socialPendingCount = snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount;

  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
      title: snapshot.profile.title,
      level: snapshot.profile.level,
      totalExp: snapshot.profile.totalExp,
      currentLevelExp: snapshot.profile.currentLevelExp,
      nextLevelExp: snapshot.profile.nextLevelExp,
      streakDays: completedQuestCount,
    },
    motto: completedQuestCount === snapshot.dashboard.dailyQuests.length ? "今日主线已清空，牛马可以喘口气。" : "不是在健身，就是在去健身的路上！",
    resources: getDashboardResources(snapshot),
    activeEffects: snapshot.dashboard.todayEffects.map(mapTodayEffect),
    dailyQuests: snapshot.dashboard.dailyQuests.map((dimension) => ({
      id: dimension.key,
      dimension: dimension.key,
      title: dimension.assignment?.title ?? "今日任务还没生成",
      subtitle: dimension.title,
      description: dimension.assignment?.description ?? dimension.description,
      image: supplyDashboardAssetPaths.taskCards[dimension.key],
      difficulty: dimension.key === "learning" ? "中" : "轻",
      tags: ["通用"],
      durationLabel: `可换 ${dimension.assignment?.rerollCount ?? 0}/${dimension.assignment?.rerollLimit ?? 1}`,
      completed: dimension.assignment?.status === "completed",
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    })),
    dailyReward: {
      claimable: snapshot.drawPool.wallet.lifeTicketClaimable,
      claimed: snapshot.drawPool.wallet.lifeTicketEarned,
    },
    shortcutLinks: [
      {
        id: "home",
        href: "/",
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
        badge: formatResourceValue(snapshot.backpack.capacity.usedSlots, snapshot.backpack.capacity.totalSlots),
        image: supplyDashboardAssetPaths.dockBackpack,
      },
      {
        id: "draw-pool",
        href: "/dashboard/cards",
        title: "抽奖池",
        subtitle: "随机获取道具、银子或真实福利！",
        badge: formatNumber(snapshot.drawPool.wallet.ticketBalance),
        image: supplyDashboardAssetPaths.dockSupplyMachine,
      },
      {
        id: "task-record",
        href: "/dashboard/quest",
        title: "任务记录",
        subtitle: "查看历史任务与奖励",
        badge: socialPendingCount > 0 ? `${socialPendingCount} 待回应` : String(snapshot.taskRecord.timeline.length),
        image: supplyDashboardAssetPaths.dockTaskRecord,
      },
    ],
    inventoryPreview: {
      usedSlots: snapshot.backpack.capacity.usedSlots,
      totalSlots: snapshot.backpack.capacity.totalSlots,
      items: getAllBackpackItems(snapshot).slice(0, 3).map((item) => ({
        id: item.itemId,
        name: item.name,
        icon: item.categoryLabel.slice(0, 1),
        quantity: item.quantity,
      })),
    },
    supplyPreview: {
      remainingDraws: snapshot.drawPool.wallet.ticketBalance,
      maxDraws: 10,
      featuredRewards: [
        { id: "ticket", name: "抽奖券", icon: "券", quantity: ticketResource?.value ?? 0 },
        { id: "coins", name: "银子", icon: "◎", quantity: snapshot.resources.coins.value },
      ],
    },
    announcement: {
      message: snapshot.drawPool.lottery.message,
    },
    socialInvitationNotice: getSocialInvitationNotice(snapshot),
  };
}

export function toSupplyDrawPoolPreview(
  snapshot: SupplyStationProductionSnapshot,
  latestDraw?: GamificationLotteryDrawSnapshot | null,
): SupplyDrawPoolPreview {
  const latestRows = latestDraw?.rewards.map(toRewardRow) ?? [];
  const recentRows = latestRows.length > 0 ? latestRows : getRecentDrawRows(snapshot.drawPool.lottery.recentDraws);

  return {
    media: {
      background: supplyDrawPoolAssetPaths.background,
      machine: supplyDrawPoolAssetPaths.drawPool.machine,
      capsuleBed: supplyDrawPoolAssetPaths.drawPool.capsuleBed,
      guideMascot: supplyDrawPoolAssetPaths.drawPool.guideMascot,
      wristband: supplyDrawPoolAssetPaths.drawPool.wristband,
      runningShoe: supplyDrawPoolAssetPaths.drawPool.runningShoe,
    },
    topBar: {
      resources: getResources(snapshot),
      closeHref: "/dashboard/status",
    },
    wallet: {
      ticketIcon: supplyDrawPoolAssetPaths.rewardIcons.ticket,
      ticketBalance: snapshot.drawPool.wallet.ticketBalance,
      dailyEarned: snapshot.drawPool.wallet.todayEarned,
      dailyLimit: snapshot.drawPool.wallet.maxFreeTicketsToday,
      helper: `今日获取上限：${snapshot.drawPool.wallet.todayEarned}/${snapshot.drawPool.wallet.maxFreeTicketsToday} 张抽奖券`,
    },
    guide: {
      mascotImage: supplyDrawPoolAssetPaths.drawPool.guideMascot,
      message: snapshot.drawPool.lottery.message,
    },
    poolRates: [
      { tier: "coin", rarity: "银子", percent: 45, tone: "n" },
      { tier: "utility", rarity: "实用", percent: 27, tone: "r" },
      { tier: "social", rarity: "社交", percent: 24, tone: "sr" },
      { tier: "rare", rarity: "稀有", percent: 4, tone: "ssr" },
    ],
    machine: {
      title: "补给抽卡机",
      emblemImage: supplyDrawPoolAssetPaths.cowLogo,
      actions: [
        { id: "single", label: "单抽", drawCount: 1, costTicket: 1, tone: "single", guaranteeLabel: "单抽无保底" },
        { id: "ten", label: "十连", drawCount: 10, costTicket: 10, tone: "ten", guaranteeLabel: "十连批次保底" },
      ],
    },
    guarantee: {
      title: "十连保底说明",
      description: "单抽没有保底；十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。",
      eligibleTiers: ["utility", "social", "rare"],
      eligibleTierLabels: ["实用", "社交", "稀有"],
    },
    recentDrops: recentRows,
    singleDrawResult: latestDraw?.drawType === "SINGLE" ? latestRows : [],
    tenDrawResult: latestDraw?.drawType === "TEN" ? latestRows : [],
    emptyDrawMessage: snapshot.drawPool.lottery.message,
    rules: [
      "消耗抽奖券进行抽取，随机获得银子、实用道具、社交道具或稀有奖励。",
      "单抽没有保底。",
      "十连批次如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。",
    ],
    probabilityHref: "/docs?tab=rules#supply-station-probability",
    recordsHref: "/dashboard/quest",
    backHref: "/dashboard/status",
  };
}

export function toSupplyBackpackPreview(
  snapshot: SupplyStationProductionSnapshot,
  selectedItemId?: string | null,
): SupplyBackpackPreview {
  const items = getAllBackpackItems(snapshot);
  const inventoryItems = items.map((item) => toInventoryItem(item, selectedItemId));
  const itemSlots: SupplyBackpackSlot[] = inventoryItems.map((item) => ({ type: "item", item }));
  const emptySlots: SupplyBackpackSlot[] = Array.from(
    { length: Math.max(0, snapshot.backpack.capacity.totalSlots - itemSlots.length) },
    (_, index) => ({ type: "empty", id: `empty-${index + 1}` }),
  );
  const itemDetails = items.map((item) => toBackpackDetail(item, snapshot.social.availableRecipients));
  const emptyDetail = getEmptyBackpackDetail(snapshot);
  const selectedItemDetail =
    itemDetails.find((detail) => detail.itemId === selectedItemId) ?? itemDetails[0] ?? emptyDetail;
  const categories: SupplyBackpackCategory[] = [
    { id: "all", label: "全部", icon: "▦", iconImage: supplyUiLabCategoryIcons.all, active: true },
    { id: "boost", label: "增益", icon: "✧", iconImage: supplyUiLabCategoryIcons.boost, active: false },
    { id: "task", label: "任务", icon: "▣", iconImage: supplyUiLabCategoryIcons.task, active: false },
    { id: "social", label: "社交", icon: "♟", iconImage: supplyUiLabCategoryIcons.social, active: false },
    { id: "real", label: "真实福利", icon: "▤", iconImage: supplyUiLabCategoryIcons.real_world, active: false },
  ];

  return {
    topBar: {
      breadcrumb: ["牛马补给站", "背包"],
      resources: getResources(snapshot),
    },
    sidebar: {
      capacity: formatResourceValue(snapshot.backpack.capacity.usedSlots, snapshot.backpack.capacity.totalSlots),
      categories,
      todayEffects: snapshot.backpack.todayEffects.map(mapTodayEffect),
    },
    inventory: {
      page: 1,
      pageSize: BACKPACK_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(snapshot.backpack.capacity.totalSlots / BACKPACK_PAGE_SIZE)),
      totalSlots: snapshot.backpack.capacity.totalSlots,
      slots: [...itemSlots, ...emptySlots],
    },
    itemDetails: itemDetails.length > 0 ? itemDetails : [emptyDetail],
    selectedItemDetail,
    hint: snapshot.backpack.emptyMessage,
  };
}

export function toSupplyShopPreview(
  snapshot: SupplyStationProductionSnapshot,
  selectedItemId?: string | null,
): SupplyShopPreview {
  const categories: SupplyShopCategory[] = ([
    "all",
    "boost",
    "protection",
    "task",
    "social",
    "real_world",
  ] as SupplyShopCategoryId[]).map((categoryId, index) => ({
    id: categoryId,
    label: shopCategoryMeta[categoryId].label,
    icon: shopCategoryMeta[categoryId].icon,
    iconImage: shopCategoryMeta[categoryId].iconImage,
    active: index === 0,
  }));
  const products = snapshot.shop.products.map((product, index) => {
    const categoryId = mapCatalogCategory(product.category);
    const catalogItem = getCatalogItem(product.itemId);
    const limitLabel = getLimitLabel(product);

    return {
      id: product.itemId,
      sourceItemId: product.itemId,
      name: product.name,
      subtitle: catalogItem?.effectSummary ?? product.description,
      categoryId,
      categoryLabel: categoryLabels[categoryId],
      image: catalogItem?.media.image ?? getItemImage(product.itemId, product.category),
      rarity: catalogItem?.rarity ?? "R",
      price: {
        currency: "coins",
        amount: product.priceCoins,
      },
      ownedQuantity: product.ownedQuantity,
      sourceLabel: "来源：抽奖池 / 商店",
      limitLabel,
      requiresAdminConfirmation: product.requiresAdminConfirmation,
      selected: selectedItemId ? product.itemId === selectedItemId : index === 0,
    } satisfies SupplyShopProduct & { sourceItemId: string };
  });
  const productDetails = snapshot.shop.products.map((product) => {
    const catalogItem = getCatalogItem(product.itemId);
    const redeemState = getRedeemState(snapshot, product);

    return {
      productId: product.itemId,
      description: product.description,
      effect: catalogItem?.effectSummary ?? product.description,
      useTiming: catalogItem?.useTiming === "today"
        ? "今日生效，可在当天结算前使用"
        : catalogItem?.useTiming === "manual_redemption"
          ? "提交申请后等待管理员确认"
          : "立即生效，兑换后进入背包",
      useTimingId: catalogItem?.useTiming ?? getItemUseTiming({
        itemId: product.itemId,
        category: product.category,
        categoryLabel: categoryLabels[mapCatalogCategory(product.category)],
        name: product.name,
        description: product.description,
        quantity: product.ownedQuantity,
        reservedQuantity: 0,
        availableQuantity: product.ownedQuantity,
        useEnabled: product.purchaseEnabled,
        useDisabledReason: product.purchaseDisabledReason,
        useTiming: product.requiresAdminConfirmation ? "manual_redemption" : "instant",
        useTimingLabel: "",
        effectSummary: product.description,
        usageLimitSummary: "",
        stackable: true,
        requiresAdminConfirmation: product.requiresAdminConfirmation,
        enabled: product.purchaseEnabled,
        knownDefinition: Boolean(catalogItem),
      }),
      purchaseLimit: getLimitLabel(product),
      costLabel: `银子 ${formatNumber(product.priceCoins)}`,
      sourceLabel: "来源：抽奖池 / 商店",
      ownedLabel: `持有 ${formatNumber(product.ownedQuantity)}`,
      adminConfirmationLabel: product.requiresAdminConfirmation ? "真实福利：兑换后进入管理员确认流程" : null,
      footnote: product.purchaseDisabledReason ?? "购买成功后会刷新真实背包库存。",
      redeemLabel: `购买 ${product.name}`,
      redeemFeedback: product.purchaseEnabled ? `购买成功：${product.name}` : product.purchaseDisabledReason ?? "暂不可买",
      redeemState,
      redeemDisabledReason: product.purchaseDisabledReason ?? undefined,
    } satisfies SupplyShopProductDetail;
  });
  const emptyDetail: SupplyShopProductDetail = {
    productId: "__empty",
    description: "补给商店暂时没有可购买商品",
    effect: "暂无",
    useTiming: "暂无",
    useTimingId: "instant",
    purchaseLimit: "暂无",
    costLabel: "银子 0",
    sourceLabel: "来源：商店",
    ownedLabel: "持有 0",
    adminConfirmationLabel: null,
    footnote: "商品上架后会显示在这里。",
    redeemLabel: "暂不可买",
    redeemFeedback: "补给商店暂时没有可购买商品",
    redeemState: "limitReached",
    redeemDisabledReason: "暂无商品",
  };

  return {
    topBar: {
      resources: getResources(snapshot),
      profile: {
        username: snapshot.profile.username,
        avatar: avatarPath(snapshot.profile.avatarKey),
      },
    },
    sidebar: {
      categories,
      resources: getResources(snapshot),
    },
    filters: [
      { id: "all", label: "全部", active: true },
      { id: "redeemable", label: "可购买", active: false },
      { id: "owned", label: "已拥有", active: false },
      { id: "admin", label: "需确认", active: false },
    ] satisfies SupplyShopFilter[],
    products,
    productDetails: productDetails.length > 0 ? productDetails : [emptyDetail],
    selectedProductDetail:
      productDetails.find((detail) => detail.productId === selectedItemId) ?? productDetails[0] ?? emptyDetail,
    notice: "商品来自真实补给商店库存与购买规则。",
    rules: [
      "购买会消耗真实银子并刷新背包。",
      "达到限购或余额不足时按钮会禁用。",
      "真实福利类商品会进入管理员确认流程。",
    ],
    initialFeedback: null,
  };
}

export function toSupplyTaskRecordPreview(snapshot: SupplyStationProductionSnapshot): SupplyTaskRecordPreview {
  const recordsByDate = Object.fromEntries(
    snapshot.taskRecord.dates.map((date) => [
      date.key,
      snapshot.taskRecord.timeline.filter((row) => row.dayKey === date.key).map(toTimelineItem),
    ]),
  );
  const radarInvites = [...snapshot.social.received, ...snapshot.social.teamWide].map(toRadarInvite);
  const redemptions: SupplyTaskRecordRedemption[] = snapshot.redemptions.mine.map((item) => ({
    id: item.id,
    icon: getItemImage(item.itemId, "real_world"),
    title: item.itemName,
    requestedAt: formatDateTime(item.requestedAt),
    secondaryLabel: item.note ?? item.statusLabel,
    status: item.status === "CONFIRMED" ? "completed" : item.status === "CANCELLED" ? "expired" : "processing",
    statusLabel: item.statusLabel,
  }));
  const filters: SupplyTaskRecordFilter[] = [
    { id: "all", label: "全部", active: true },
    { id: "mainline", label: "主线任务", active: false },
    { id: "social", label: "社交互动", active: false },
    { id: "reward", label: "奖励领取", active: false },
    { id: "system", label: "系统通知", active: false },
  ];

  return {
    activeMode: "today",
    activeDateKey: snapshot.taskRecord.dates[0]?.key ?? snapshot.dayKey,
    dates: snapshot.taskRecord.dates,
    recordsByDate,
    drawHistory: snapshot.drawPool.lottery.recentDraws.map((draw) => ({
      id: draw.id,
      drawType: draw.drawType === "TEN" ? "十连" : "单抽",
      time: formatDateTime(draw.createdAt),
      ticketSpent: draw.ticketSpent,
      guaranteeApplied: draw.guaranteeApplied,
      guaranteeLabel: draw.guaranteeApplied ? "触发保底" : "未触发保底",
      rewards: draw.rewards.map((reward, index) => ({
        name: reward.name,
        quantityLabel: reward.rewardKind === "coins" ? reward.effectSummary : `x${index + 1}`,
        rarity: mapRewardRarity(reward),
      })),
    })),
    rules: [
      "最近 7 天记录来自真实业务流水。",
      "抽奖、购买、兑换、道具和队友雷达会在操作成功后进入记录。",
      "管理员确认类福利以兑换状态为准。",
    ],
    topBar: {
      resources: getResources(snapshot),
      profile: {
        username: snapshot.profile.username,
        avatar: avatarPath(snapshot.profile.avatarKey),
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
    filters,
    radar: {
      tabs: [
        { id: "pending", label: `待响应 (${snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount})`, active: true },
        { id: "responded", label: "已回应", active: false },
        { id: "expired", label: "已过期", active: false },
      ],
      invites: radarInvites,
    },
    redemptions: {
      items: redemptions,
    },
  };
}
