# GM-13 Team Dynamics Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect high-value `牛马补给站` events to the existing Team Dynamics timeline without making Team Dynamics a dependency of normal game flow success.

**Architecture:** GM-13 extends the mainline `TEAM_DYNAMIC_TYPES` metadata and adds a small game bridge service in `lib/gamification/team-dynamics.ts`. Game services call the bridge after their own transactions succeed; the bridge uses mainline `createOrReuseTeamDynamic` with stable `sourceType + sourceId` keys and catches production write failures so lottery, tasks, boost, and social flows do not roll back.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, existing Team Dynamics service from the mainline plan.

---

## File Structure

- Modify: `lib/team-dynamics.ts`
  - Add game event types to the mainline Team Dynamics type registry and card metadata.
- Create: `lib/gamification/team-dynamics.ts`
  - Game-specific predicates, payload builders, and safe emit helpers that call `createOrReuseTeamDynamic`.
- Modify: `lib/gamification/lottery.ts`
  - Emit rare-prize dynamics after lottery draw persistence succeeds.
- Modify: `lib/gamification/tasks.ts`
  - Emit four-dimension streak milestone dynamics after life-ticket claim succeeds.
- Modify: `lib/gamification/boost-settlement.ts`
  - Emit boost milestone dynamics after boost settlement succeeds.
- Modify: `lib/gamification/social-invitations.ts`
  - Emit team broadcast and multi-response social moment dynamics.
- Create: `__tests__/gamification-team-dynamics-meta.test.ts`
  - Type registry and UI metadata coverage.
- Create: `__tests__/gamification-team-dynamics.test.ts`
  - Bridge-service predicate, payload, idempotency, and failure-isolation coverage.
- Modify: `__tests__/gamification-lottery-api.test.ts`
  - Rare reward integration coverage.
- Modify: `__tests__/gamification-daily-tasks.test.ts`
  - Four-dimension streak milestone integration coverage.
- Modify: `__tests__/gamification-boost-settlement.test.ts`
  - Boost milestone integration coverage.
- Modify: `__tests__/gamification-social-invitations.test.ts`
  - Team broadcast and social moment integration coverage.

## Implementation Rules

- Do not create `TeamDynamic` or `TeamDynamicReadState`; GM-13 requires the mainline Team Dynamics story to provide them.
- Do not add a new public API route.
- Do not write ordinary task completion, ordinary ticket claim, ordinary coin reward, ordinary direct social invitation, or ordinary social response into Team Dynamics.
- Always use `createOrReuseTeamDynamic`; never write `prisma.teamDynamic.create` directly from game code.
- Every game dynamic must have stable `sourceType + sourceId`.
- Team Dynamics write failure must return a `FAILED` bridge result and must not throw from production game service flows.
- Tests may call the strict emitter directly to assert errors, but API-facing game flows use the safe wrapper.

---

### Task 1: Extend Mainline Team Dynamics Types

**Files:**
- Create: `__tests__/gamification-team-dynamics-meta.test.ts`
- Modify: `lib/team-dynamics.ts`

- [ ] **Step 1: Verify the Team Dynamics mainline dependency exists**

Run:

```bash
test -f lib/team-dynamics.ts
test -f lib/team-dynamics-service.ts
rg -n "createOrReuseTeamDynamic" lib/team-dynamics-service.ts
```

Expected: all commands exit with code `0`. If any command fails, stop GM-13 and finish the mainline Team Dynamics story first.

- [ ] **Step 2: Write failing metadata tests**

Create `__tests__/gamification-team-dynamics-meta.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getTeamDynamicMeta, TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

describe("gamification team dynamics metadata", () => {
  it("registers every game dynamic type", () => {
    expect(TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE).toBe("GAME_RARE_PRIZE");
    expect(TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE).toBe(
      "GAME_TASK_STREAK_MILESTONE",
    );
    expect(TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE).toBe("GAME_BOOST_MILESTONE");
    expect(TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST).toBe("GAME_TEAM_BROADCAST");
    expect(TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT).toBe("GAME_SOCIAL_MOMENT");
  });

  it("returns readable card metadata for game dynamic types", () => {
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE)).toMatchObject({
      label: "补给高光",
      tone: "highlight",
    });
    expect(
      getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE),
    ).toMatchObject({
      label: "摸鱼自律",
      tone: "success",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE)).toMatchObject({
      label: "暴击打卡",
      tone: "highlight",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST)).toMatchObject({
      label: "团队小喇叭",
      tone: "default",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT)).toMatchObject({
      label: "牛马互动",
      tone: "success",
    });
  });
});
```

- [ ] **Step 3: Run the metadata test and confirm it fails**

Run:

```bash
npm test -- __tests__/gamification-team-dynamics-meta.test.ts
```

Expected: FAIL because the five `GAME_*` types are not registered.

- [ ] **Step 4: Add game dynamic constants and metadata**

Modify `lib/team-dynamics.ts` so the existing `TEAM_DYNAMIC_TYPES` object includes these entries:

```ts
export const TEAM_DYNAMIC_TYPES = {
  WEEKLY_REPORT_CREATED: "WEEKLY_REPORT_CREATED",
  SEASON_STARTED: "SEASON_STARTED",
  SEASON_TARGET_REACHED: "SEASON_TARGET_REACHED",
  SEASON_ENDED: "SEASON_ENDED",
  TEAM_FULL_ATTENDANCE: "TEAM_FULL_ATTENDANCE",
  STREAK_MILESTONE: "STREAK_MILESTONE",
  COFFEE_SUMMARY: "COFFEE_SUMMARY",
  BOARD_NOTICE_REFERENCE: "BOARD_NOTICE_REFERENCE",
  GAME_RARE_PRIZE: "GAME_RARE_PRIZE",
  GAME_TASK_STREAK_MILESTONE: "GAME_TASK_STREAK_MILESTONE",
  GAME_BOOST_MILESTONE: "GAME_BOOST_MILESTONE",
  GAME_TEAM_BROADCAST: "GAME_TEAM_BROADCAST",
  GAME_SOCIAL_MOMENT: "GAME_SOCIAL_MOMENT",
} as const;
```

Extend `getTeamDynamicMeta` with these switch cases:

```ts
case TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE:
  return { label: "补给高光", tone: "highlight" } as const;
case TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE:
  return { label: "摸鱼自律", tone: "success" } as const;
case TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE:
  return { label: "暴击打卡", tone: "highlight" } as const;
case TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST:
  return { label: "团队小喇叭", tone: "default" } as const;
case TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT:
  return { label: "牛马互动", tone: "success" } as const;
```

- [ ] **Step 5: Run the metadata test and confirm it passes**

Run:

```bash
npm test -- __tests__/gamification-team-dynamics-meta.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit type metadata work**

```bash
git add __tests__/gamification-team-dynamics-meta.test.ts lib/team-dynamics.ts
git commit -m "feat: register game team dynamics types"
```

---

### Task 2: Add the Game Team Dynamics Bridge Service

**Files:**
- Create: `__tests__/gamification-team-dynamics.test.ts`
- Create: `lib/gamification/team-dynamics.ts`

- [ ] **Step 1: Write failing bridge-service tests**

Create `__tests__/gamification-team-dynamics.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import {
  buildBoostMilestoneDynamic,
  buildRarePrizeDynamic,
  buildSocialMomentDynamic,
  buildTaskStreakDynamic,
  buildTeamBroadcastDynamic,
  GAME_TASK_STREAK_MILESTONES,
  safeCreateGameTeamDynamic,
  shouldHighlightBoost,
  shouldHighlightLotteryReward,
} from "@/lib/gamification/team-dynamics";

describe("gamification team dynamics bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the approved four-dimension streak milestones", () => {
    expect(GAME_TASK_STREAK_MILESTONES).toEqual([3, 7, 14, 30]);
  });

  it("highlights rare, real-world, and explicitly highlighted lottery rewards", () => {
    expect(shouldHighlightLotteryReward({ rewardTier: "rare" })).toBe(true);
    expect(shouldHighlightLotteryReward({ rewardTier: "real_world" })).toBe(true);
    expect(shouldHighlightLotteryReward({ rewardTier: "common" })).toBe(false);
    expect(
      shouldHighlightLotteryReward({
        rewardTier: "common",
        highlightInDynamics: true,
      }),
    ).toBe(true);
  });

  it("highlights boost only when bonus at least doubles one reward lane or item is explicit", () => {
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 40,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
      }),
    ).toBe(true);
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 20,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
      }),
    ).toBe(false);
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 20,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
        highlightInDynamics: true,
      }),
    ).toBe(true);
  });

  it("builds stable source keys for every game dynamic", () => {
    expect(
      buildRarePrizeDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        drawId: "draw_1",
        resultId: "result_1",
        rewardId: "luckin_coffee_coupon",
        rewardName: "瑞幸咖啡券",
        rewardTier: "rare",
        dayKey: "2026-04-26",
        occurredAt: new Date("2026-04-26T09:00:00+08:00"),
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
      sourceType: "lottery_draw_result",
      sourceId: "result_1",
      title: "li 抽中了瑞幸咖啡券",
    });

    expect(
      buildTaskStreakDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        milestone: 7,
        dayKey: "2026-04-26",
        occurredAt: new Date("2026-04-26T09:00:00+08:00"),
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE,
      sourceType: "daily_task_streak",
      sourceId: "user_1:7:2026-04-26",
    });

    expect(
      buildBoostMilestoneDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        punchRecordId: "punch_1",
        itemUseRecordId: "use_1",
        itemId: "double_niuma_coupon",
        itemName: "双倍牛马券",
        baseAssetAwarded: 40,
        boostAssetBonus: 40,
        baseSeasonContribution: 40,
        boostSeasonBonus: 40,
        dayKey: "2026-04-26",
        occurredAt: new Date("2026-04-26T09:00:00+08:00"),
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE,
      sourceType: "punch_record_boost",
      sourceId: "punch_1",
    });

    expect(
      buildTeamBroadcastDynamic({
        teamId: "team_1",
        senderUserId: "user_1",
        senderName: "li",
        invitationId: "invitation_1",
        itemId: "team_broadcast_coupon",
        message: "站起来走一圈",
        dayKey: "2026-04-26",
        occurredAt: new Date("2026-04-26T09:00:00+08:00"),
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST,
      sourceType: "social_invitation_broadcast",
      sourceId: "invitation_1",
    });

    expect(
      buildSocialMomentDynamic({
        teamId: "team_1",
        invitationId: "invitation_1",
        invitationType: "TEAM_STANDUP",
        senderUserId: "user_1",
        senderName: "li",
        responseCount: 2,
        responders: [
          { userId: "user_2", displayName: "luo" },
          { userId: "user_3", displayName: "liu" },
        ],
        dayKey: "2026-04-26",
        occurredAt: new Date("2026-04-26T09:00:00+08:00"),
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT,
      sourceType: "social_invitation_moment",
      sourceId: "invitation_1",
    });
  });

  it("returns failed when the safe creator catches a downstream error", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db unavailable"));

    await expect(
      safeCreateGameTeamDynamic(
        {
          teamId: "team_1",
          type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
          title: "li 抽中了瑞幸咖啡券",
          summary: "补给站出大货了",
          payloadJson: "{}",
          actorUserId: "user_1",
          sourceType: "lottery_draw_result",
          sourceId: "result_1",
          importance: "high",
          occurredAt: new Date("2026-04-26T09:00:00+08:00"),
        },
        create,
      ),
    ).resolves.toMatchObject({
      status: "FAILED",
      type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
    });
  });
});
```

- [ ] **Step 2: Run the bridge-service test and confirm it fails**

Run:

```bash
npm test -- __tests__/gamification-team-dynamics.test.ts
```

Expected: FAIL because `lib/gamification/team-dynamics.ts` does not exist.

- [ ] **Step 3: Implement the bridge service**

Create `lib/gamification/team-dynamics.ts`:

```ts
import { TEAM_DYNAMIC_TYPES, type TeamDynamicType } from "@/lib/team-dynamics";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

export const GAME_TASK_STREAK_MILESTONES = [3, 7, 14, 30] as const;

export type GameTaskStreakMilestone = (typeof GAME_TASK_STREAK_MILESTONES)[number];

export interface GameDynamicCreateInput {
  teamId: string;
  type: TeamDynamicType;
  title: string;
  summary: string;
  payloadJson: string;
  actorUserId: string | null;
  sourceType: string;
  sourceId: string;
  importance: "normal" | "high";
  occurredAt: Date;
}

export interface GameTeamDynamicResult {
  status: "CREATED" | "EXISTING" | "SKIPPED" | "FAILED";
  type?: TeamDynamicType;
  teamDynamicId?: string;
  failureReason?: string;
}

type CreateGameDynamic = (
  input: GameDynamicCreateInput,
) => Promise<{ id: string; created: boolean }>;

export function shouldHighlightLotteryReward(input: {
  rewardTier: string;
  highlightInDynamics?: boolean;
}) {
  return (
    input.rewardTier === "rare" ||
    input.rewardTier === "real_world" ||
    input.highlightInDynamics === true
  );
}

export function shouldHighlightBoost(input: {
  baseAssetAwarded: number;
  boostAssetBonus: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  highlightInDynamics?: boolean;
}) {
  if (input.highlightInDynamics) {
    return true;
  }

  return (
    (input.baseAssetAwarded > 0 && input.boostAssetBonus >= input.baseAssetAwarded) ||
    (input.baseSeasonContribution > 0 &&
      input.boostSeasonBonus >= input.baseSeasonContribution)
  );
}

export function isGameTaskStreakMilestone(value: number): value is GameTaskStreakMilestone {
  return GAME_TASK_STREAK_MILESTONES.includes(value as GameTaskStreakMilestone);
}

export function buildRarePrizeDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  drawId: string;
  resultId: string;
  rewardId: string;
  rewardName: string;
  rewardTier: string;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
    title: `${input.displayName} 抽中了${input.rewardName}`,
    summary: "牛马补给站出大货了，建议全队围观。",
    payloadJson: JSON.stringify(input),
    actorUserId: input.userId,
    sourceType: "lottery_draw_result",
    sourceId: input.resultId,
    importance: "high",
    occurredAt: input.occurredAt,
  };
}

export function buildTaskStreakDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  milestone: GameTaskStreakMilestone;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE,
    title: `${input.displayName} 连续 ${input.milestone} 天完成四维摸鱼任务`,
    summary: "站一站、喝白白、把事办黄、把股看红，今日全部达标。",
    payloadJson: JSON.stringify({
      ...input,
      dimensions: ["movement", "hydration", "social", "learning"],
    }),
    actorUserId: input.userId,
    sourceType: "daily_task_streak",
    sourceId: `${input.userId}:${input.milestone}:${input.dayKey}`,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export function buildBoostMilestoneDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  punchRecordId: string;
  itemUseRecordId: string;
  itemId: string;
  itemName: string;
  baseAssetAwarded: number;
  boostAssetBonus: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE,
    title: `${input.displayName} 的${input.itemName}生效，今日收益暴击`,
    summary: `个人银子 +${input.boostAssetBonus}，赛季贡献 +${input.boostSeasonBonus}。`,
    payloadJson: JSON.stringify(input),
    actorUserId: input.userId,
    sourceType: "punch_record_boost",
    sourceId: input.punchRecordId,
    importance: "high",
    occurredAt: input.occurredAt,
  };
}

export function buildTeamBroadcastDynamic(input: {
  teamId: string;
  senderUserId: string;
  senderName: string;
  invitationId: string;
  itemId: string;
  message: string;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST,
    title: `${input.senderName} 发了一条团队小喇叭`,
    summary: input.message,
    payloadJson: JSON.stringify(input),
    actorUserId: input.senderUserId,
    sourceType: "social_invitation_broadcast",
    sourceId: input.invitationId,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export function buildSocialMomentDynamic(input: {
  teamId: string;
  invitationId: string;
  invitationType: string;
  senderUserId: string;
  senderName: string;
  responseCount: number;
  responders: Array<{ userId: string; displayName: string }>;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT,
    title: `${input.senderName} 的全队邀请收到 ${input.responseCount} 个响应`,
    summary: "这不是考核，这是牛马之间最后的温情。",
    payloadJson: JSON.stringify(input),
    actorUserId: input.senderUserId,
    sourceType: "social_invitation_moment",
    sourceId: input.invitationId,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export async function safeCreateGameTeamDynamic(
  input: GameDynamicCreateInput,
  create: CreateGameDynamic = createOrReuseTeamDynamic,
): Promise<GameTeamDynamicResult> {
  try {
    const result = await create(input);

    return {
      status: result.created ? "CREATED" : "EXISTING",
      type: input.type,
      teamDynamicId: result.id,
    };
  } catch (error) {
    console.warn("[gamification] failed to create team dynamic", {
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      error,
    });

    return {
      status: "FAILED",
      type: input.type,
      failureReason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
```

- [ ] **Step 4: Run the bridge-service test and confirm it passes**

Run:

```bash
npm test -- __tests__/gamification-team-dynamics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the bridge service**

```bash
git add __tests__/gamification-team-dynamics.test.ts lib/gamification/team-dynamics.ts
git commit -m "feat: add game team dynamics bridge"
```

---

### Task 3: Emit Rare Prize Dynamics From Lottery

**Files:**
- Modify: `__tests__/gamification-lottery-api.test.ts`
- Modify: `lib/gamification/lottery.ts`

- [ ] **Step 1: Add failing lottery integration tests**

Add these tests to `__tests__/gamification-lottery-api.test.ts`:

```ts
it("writes a team dynamic for highlighted rare lottery rewards", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  await prisma.user.update({
    where: { id: user.id },
    data: { ticketBalance: 1 },
  });

  vi.spyOn(rewardPoolModule, "pickLotteryReward").mockReturnValue({
    id: "luckin_coffee_coupon",
    name: "瑞幸咖啡券",
    tier: "rare",
    kind: "item",
    itemId: "luckin_coffee_coupon",
    quantity: 1,
    highlightInDynamics: true,
  });

  const response = await POST(makeAuthedRequest(user.id, { mode: "single" }));
  expect(response.status).toBe(200);

  const dynamic = await prisma.teamDynamic.findFirstOrThrow({
    where: {
      teamId: user.teamId,
      type: "GAME_RARE_PRIZE",
      sourceType: "lottery_draw_result",
    },
  });

  expect(dynamic.title).toContain("瑞幸咖啡券");
  expect(dynamic.actorUserId).toBe(user.id);
});

it("does not write a team dynamic for common coin rewards", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  await prisma.user.update({
    where: { id: user.id },
    data: { ticketBalance: 1 },
  });

  vi.spyOn(rewardPoolModule, "pickLotteryReward").mockReturnValue({
    id: "coin_10",
    name: "10 银子",
    tier: "common",
    kind: "coins",
    coins: 10,
  });

  const response = await POST(makeAuthedRequest(user.id, { mode: "single" }));
  expect(response.status).toBe(200);

  const count = await prisma.teamDynamic.count({
    where: { teamId: user.teamId, type: "GAME_RARE_PRIZE" },
  });
  expect(count).toBe(0);
});
```

- [ ] **Step 2: Run the lottery integration tests and confirm they fail**

Run:

```bash
npm test -- __tests__/gamification-lottery-api.test.ts
```

Expected: FAIL because lottery draw does not emit `GAME_RARE_PRIZE`.

- [ ] **Step 3: Add rare-prize emission after draw transaction**

In `lib/gamification/lottery.ts`, import the bridge helpers:

```ts
import {
  buildRarePrizeDynamic,
  safeCreateGameTeamDynamic,
  shouldHighlightLotteryReward,
} from "@/lib/gamification/team-dynamics";
```

After the draw transaction returns persisted `draw`, `results`, and user snapshot, add:

```ts
const teamDynamicResults = [];

for (const result of persistedResults) {
  if (
    !shouldHighlightLotteryReward({
      rewardTier: result.rewardTier,
      highlightInDynamics: result.rewardSnapshot.highlightInDynamics,
    })
  ) {
    teamDynamicResults.push({ status: "SKIPPED" as const });
    continue;
  }

  teamDynamicResults.push(
    await safeCreateGameTeamDynamic(
      buildRarePrizeDynamic({
        teamId: actor.teamId,
        userId: actor.id,
        displayName: actor.displayName ?? actor.username,
        drawId: draw.id,
        resultId: result.id,
        rewardId: result.rewardId,
        rewardName: result.rewardSnapshot.name,
        rewardTier: result.rewardTier,
        dayKey: draw.dayKey,
        occurredAt: draw.createdAt,
      }),
    ),
  );
}
```

Return the optional bridge status without making UI depend on it:

```ts
return {
  ...drawResponse,
  teamDynamics: teamDynamicResults,
};
```

- [ ] **Step 4: Run lottery integration tests**

Run:

```bash
npm test -- __tests__/gamification-lottery-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit lottery integration**

```bash
git add __tests__/gamification-lottery-api.test.ts lib/gamification/lottery.ts
git commit -m "feat: emit rare prize team dynamics"
```

---

### Task 4: Emit Four-Dimension Streak Milestones

**Files:**
- Modify: `__tests__/gamification-daily-tasks.test.ts`
- Modify: `lib/gamification/tasks.ts`

- [ ] **Step 1: Add failing daily-task milestone test**

Add this test to `__tests__/gamification-daily-tasks.test.ts`:

```ts
it("writes a team dynamic when all-four completion streak reaches 3 days", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  const dayKeys = ["2026-04-24", "2026-04-25", "2026-04-26"];

  for (const dayKey of dayKeys) {
    await seedCompletedFourDimensionAssignments({
      userId: user.id,
      teamId: user.teamId,
      dayKey,
    });
  }

  await claimLifeTicket({
    userId: user.id,
    dayKey: "2026-04-26",
    now: new Date("2026-04-26T09:00:00+08:00"),
  });

  const dynamic = await prisma.teamDynamic.findFirstOrThrow({
    where: {
      teamId: user.teamId,
      type: "GAME_TASK_STREAK_MILESTONE",
      sourceType: "daily_task_streak",
      sourceId: `${user.id}:3:2026-04-26`,
    },
  });

  expect(dynamic.title).toContain("连续 3 天");
});
```

- [ ] **Step 2: Run daily-task tests and confirm failure**

Run:

```bash
npm test -- __tests__/gamification-daily-tasks.test.ts
```

Expected: FAIL because life-ticket claim does not create a game team dynamic.

- [ ] **Step 3: Add all-four streak counting helper**

In `lib/gamification/tasks.ts`, add:

```ts
import { getShanghaiDayKey } from "@/lib/economy";
import {
  buildTaskStreakDynamic,
  isGameTaskStreakMilestone,
  safeCreateGameTeamDynamic,
} from "@/lib/gamification/team-dynamics";
```

Add a helper near the existing task service functions:

```ts
async function countConsecutiveAllFourCompletionDays(input: {
  userId: string;
  dayKey: string;
}) {
  let streak = 0;
  let cursor = new Date(`${input.dayKey}T00:00:00+08:00`);

  while (streak < 30) {
    const key = getShanghaiDayKey(cursor);
    const completedCount = await prisma.dailyTaskAssignment.count({
      where: {
        userId: input.userId,
        dayKey: key,
        status: "COMPLETED",
      },
    });

    if (completedCount < 4) {
      break;
    }

    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}
```

- [ ] **Step 4: Emit milestone after life-ticket claim succeeds**

After `claimLifeTicket` persists the ledger and balance update, add:

```ts
const allFourStreak = await countConsecutiveAllFourCompletionDays({
  userId: actor.id,
  dayKey,
});

const teamDynamic = isGameTaskStreakMilestone(allFourStreak)
  ? await safeCreateGameTeamDynamic(
      buildTaskStreakDynamic({
        teamId: actor.teamId,
        userId: actor.id,
        displayName: actor.displayName ?? actor.username,
        milestone: allFourStreak,
        dayKey,
        occurredAt: now,
      }),
    )
  : { status: "SKIPPED" as const };
```

Return the optional bridge status:

```ts
return {
  ...claimResult,
  teamDynamic,
};
```

- [ ] **Step 5: Run daily-task tests**

Run:

```bash
npm test -- __tests__/gamification-daily-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit daily-task milestone integration**

```bash
git add __tests__/gamification-daily-tasks.test.ts lib/gamification/tasks.ts
git commit -m "feat: emit task streak team dynamics"
```

---

### Task 5: Emit Boost Milestone Dynamics

**Files:**
- Modify: `__tests__/gamification-boost-settlement.test.ts`
- Modify: `lib/gamification/boost-settlement.ts`

- [ ] **Step 1: Add failing boost milestone tests**

Add these tests to `__tests__/gamification-boost-settlement.test.ts`:

```ts
it("writes a team dynamic when double niuma coupon settles", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
  const result = await settleBoostForPunch({
    userId: user.id,
    itemId: "double_niuma_coupon",
    punchRecordId: "punch_1",
    dayKey: "2026-04-26",
    now: new Date("2026-04-26T09:00:00+08:00"),
  });

  expect(result.boostSummary.itemId).toBe("double_niuma_coupon");

  const dynamic = await prisma.teamDynamic.findFirstOrThrow({
    where: {
      teamId: user.teamId,
      type: "GAME_BOOST_MILESTONE",
      sourceType: "punch_record_boost",
    },
  });

  expect(dynamic.title).toContain("双倍牛马券");
});

it("does not write a team dynamic for a non-highlight small boost", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

  await settleBoostForPunch({
    userId: user.id,
    itemId: "small_boost_coupon",
    punchRecordId: "punch_1",
    dayKey: "2026-04-26",
    now: new Date("2026-04-26T09:00:00+08:00"),
  });

  const count = await prisma.teamDynamic.count({
    where: { teamId: user.teamId, type: "GAME_BOOST_MILESTONE" },
  });
  expect(count).toBe(0);
});
```

- [ ] **Step 2: Run boost tests and confirm failure**

Run:

```bash
npm test -- __tests__/gamification-boost-settlement.test.ts
```

Expected: FAIL because boost settlement does not emit `GAME_BOOST_MILESTONE`.

- [ ] **Step 3: Add boost milestone emission**

In `lib/gamification/boost-settlement.ts`, import:

```ts
import {
  buildBoostMilestoneDynamic,
  safeCreateGameTeamDynamic,
  shouldHighlightBoost,
} from "@/lib/gamification/team-dynamics";
```

After boost settlement persists `PunchRecord` and `ItemUseRecord.SETTLED`, add:

```ts
const highlightBoost = shouldHighlightBoost({
  baseAssetAwarded: punch.baseAssetAwarded,
  boostAssetBonus: punch.boostAssetBonus,
  baseSeasonContribution: punch.baseSeasonContribution,
  boostSeasonBonus: punch.boostSeasonBonus,
  highlightInDynamics: itemDefinition.highlightInDynamics,
});

const teamDynamic = highlightBoost
  ? await safeCreateGameTeamDynamic(
      buildBoostMilestoneDynamic({
        teamId: actor.teamId,
        userId: actor.id,
        displayName: actor.displayName ?? actor.username,
        punchRecordId: punch.id,
        itemUseRecordId: itemUse.id,
        itemId: itemDefinition.id,
        itemName: itemDefinition.name,
        baseAssetAwarded: punch.baseAssetAwarded,
        boostAssetBonus: punch.boostAssetBonus,
        baseSeasonContribution: punch.baseSeasonContribution,
        boostSeasonBonus: punch.boostSeasonBonus,
        dayKey: punch.dayKey,
        occurredAt: punch.createdAt,
      }),
    )
  : { status: "SKIPPED" as const };
```

Include the optional result in the service response:

```ts
return {
  ...settlementResult,
  teamDynamic,
};
```

- [ ] **Step 4: Run boost tests**

Run:

```bash
npm test -- __tests__/gamification-boost-settlement.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit boost milestone integration**

```bash
git add __tests__/gamification-boost-settlement.test.ts lib/gamification/boost-settlement.ts
git commit -m "feat: emit boost milestone team dynamics"
```

---

### Task 6: Emit Social Broadcast and Social Moment Dynamics

**Files:**
- Modify: `__tests__/gamification-social-invitations.test.ts`
- Modify: `lib/gamification/social-invitations.ts`

- [ ] **Step 1: Add failing social dynamic tests**

Add these tests to `__tests__/gamification-social-invitations.test.ts`:

```ts
it("writes a team broadcast dynamic when team broadcast coupon is used", async () => {
  await prisma.inventoryItem.create({
    data: { userId: senderId, teamId, itemId: "team_broadcast_coupon", quantity: 1 },
  });

  const result = await createSocialInvitationFromItem({
    userId: senderId,
    itemId: "team_broadcast_coupon",
    target: { message: "今天都站起来，别让椅子以为自己赢了。" },
    fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
  });

  const dynamic = await prisma.teamDynamic.findFirstOrThrow({
    where: {
      teamId,
      type: "GAME_TEAM_BROADCAST",
      sourceType: "social_invitation_broadcast",
      sourceId: result.invitation.id,
    },
  });

  expect(dynamic.summary).toContain("椅子");
});

it("writes one social moment dynamic when a team-wide invitation reaches two responses", async () => {
  await prisma.inventoryItem.create({
    data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
  });
  const created = await createSocialInvitationFromItem({
    userId: senderId,
    itemId: "team_standup_ping",
    target: {},
    fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
  });

  await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });
  await respondToSocialInvitation({ userId: thirdUserId, invitationId: created.invitation.id });

  const count = await prisma.teamDynamic.count({
    where: {
      teamId,
      type: "GAME_SOCIAL_MOMENT",
      sourceType: "social_invitation_moment",
      sourceId: created.invitation.id,
    },
  });
  expect(count).toBe(1);
});

it("does not write social moment dynamic after only one team-wide response", async () => {
  await prisma.inventoryItem.create({
    data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
  });
  const created = await createSocialInvitationFromItem({
    userId: senderId,
    itemId: "team_standup_ping",
    target: {},
    fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
  });

  await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });

  const count = await prisma.teamDynamic.count({
    where: { teamId, type: "GAME_SOCIAL_MOMENT" },
  });
  expect(count).toBe(0);
});
```

- [ ] **Step 2: Run social invitation tests and confirm failure**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: FAIL because social invitation flows do not emit game team dynamics.

- [ ] **Step 3: Emit team broadcast dynamic after broadcast invitation creation**

In `lib/gamification/social-invitations.ts`, import:

```ts
import {
  buildSocialMomentDynamic,
  buildTeamBroadcastDynamic,
  safeCreateGameTeamDynamic,
} from "@/lib/gamification/team-dynamics";
```

After `team_broadcast_coupon` creates the local `SocialInvitation`, add:

```ts
const teamDynamic =
  invitation.invitationType === "TEAM_BROADCAST"
    ? await safeCreateGameTeamDynamic(
        buildTeamBroadcastDynamic({
          teamId: actor.teamId,
          senderUserId: actor.id,
          senderName: actor.displayName ?? actor.username,
          invitationId: invitation.id,
          itemId,
          message: invitation.message,
          dayKey: invitation.dayKey,
          occurredAt: invitation.createdAt,
        }),
      )
    : { status: "SKIPPED" as const };
```

Include `teamDynamic` in the returned social item result.

- [ ] **Step 4: Emit social moment dynamic after the second team-wide response**

After `respondToSocialInvitation` creates `SocialInvitationResponse`, add:

```ts
const responseCount = await prisma.socialInvitationResponse.count({
  where: { invitationId: invitation.id },
});

const responders = await prisma.socialInvitationResponse.findMany({
  where: { invitationId: invitation.id },
  include: { responderUser: true },
  orderBy: { createdAt: "asc" },
});

const teamDynamic =
  invitation.recipientUserId === null && responseCount >= 2
    ? await safeCreateGameTeamDynamic(
        buildSocialMomentDynamic({
          teamId: invitation.teamId,
          invitationId: invitation.id,
          invitationType: invitation.invitationType,
          senderUserId: invitation.senderUserId,
          senderName:
            invitation.senderUser.displayName ?? invitation.senderUser.username,
          responseCount,
          responders: responders.map((response) => ({
            userId: response.responderUserId,
            displayName:
              response.responderUser.displayName ?? response.responderUser.username,
          })),
          dayKey: invitation.dayKey,
          occurredAt: response.createdAt,
        }),
      )
    : { status: "SKIPPED" as const };
```

Use `include: { senderUser: true }` when loading the invitation for response handling so `senderName` is available.

- [ ] **Step 5: Run social invitation tests**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit social dynamic integration**

```bash
git add __tests__/gamification-social-invitations.test.ts lib/gamification/social-invitations.ts
git commit -m "feat: emit social team dynamics"
```

---

### Task 7: Verify Failure Isolation and Full Regression

**Files:**
- Modify: `__tests__/gamification-lottery-api.test.ts`
- Modify: `__tests__/gamification-daily-tasks.test.ts`
- Modify: `__tests__/gamification-boost-settlement.test.ts`
- Modify: `__tests__/gamification-social-invitations.test.ts`

- [ ] **Step 1: Add one failure-isolation assertion to each API-facing flow**

For lottery, mock `createOrReuseTeamDynamic` to reject and assert the draw still succeeds:

```ts
vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
  new Error("team dynamics unavailable"),
);

const response = await POST(makeAuthedRequest(user.id, { mode: "single" }));
expect(response.status).toBe(200);
expect(await prisma.lotteryDraw.count({ where: { userId: user.id } })).toBe(1);
```

For life-ticket claim, mock the same rejection and assert `ticketBalance` still increases:

```ts
vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
  new Error("team dynamics unavailable"),
);

await claimLifeTicket({
  userId: user.id,
  dayKey: "2026-04-26",
  now: new Date("2026-04-26T09:00:00+08:00"),
});

const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
expect(refreshed.ticketBalance).toBe(1);
```

For boost settlement, mock the rejection and assert boost settlement remains `SETTLED`:

```ts
vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
  new Error("team dynamics unavailable"),
);

const result = await settleBoostForPunch({
  userId: user.id,
  itemId: "double_niuma_coupon",
  punchRecordId: "punch_1",
  dayKey: "2026-04-26",
  now: new Date("2026-04-26T09:00:00+08:00"),
});
const itemUse = await prisma.itemUseRecord.findUniqueOrThrow({
  where: { id: result.itemUseRecordId },
});
expect(itemUse.status).toBe("SETTLED");
```

For social response, mock the rejection and assert the response record still exists:

```ts
vi.spyOn(teamDynamicsService, "createOrReuseTeamDynamic").mockRejectedValue(
  new Error("team dynamics unavailable"),
);

const response = await respondToSocialInvitation({
  userId: thirdUserId,
  invitationId: created.invitation.id,
});

expect(response.responderUserId).toBe(thirdUserId);
```

- [ ] **Step 2: Run focused GM-13 tests**

Run:

```bash
npm test -- \
  __tests__/gamification-team-dynamics-meta.test.ts \
  __tests__/gamification-team-dynamics.test.ts \
  __tests__/gamification-lottery-api.test.ts \
  __tests__/gamification-daily-tasks.test.ts \
  __tests__/gamification-boost-settlement.test.ts \
  __tests__/gamification-social-invitations.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 4: Commit regression coverage**

```bash
git add __tests__/gamification-lottery-api.test.ts \
  __tests__/gamification-daily-tasks.test.ts \
  __tests__/gamification-boost-settlement.test.ts \
  __tests__/gamification-social-invitations.test.ts
git commit -m "test: cover game team dynamics failure isolation"
```

---

## Acceptance Checklist

- [ ] Mainline Team Dynamics exists before GM-13 starts.
- [ ] `GAME_RARE_PRIZE`, `GAME_TASK_STREAK_MILESTONE`, `GAME_BOOST_MILESTONE`, `GAME_TEAM_BROADCAST`, and `GAME_SOCIAL_MOMENT` are registered in Team Dynamics metadata.
- [ ] Rare or real-world lottery rewards write exactly one `GAME_RARE_PRIZE` per `LotteryDrawResult`.
- [ ] Common lottery rewards do not write Team Dynamics entries.
- [ ] Four-dimension completion streaks write only at `3 / 7 / 14 / 30` days.
- [ ] Highlight boost settlements write exactly one `GAME_BOOST_MILESTONE` per `PunchRecord`.
- [ ] `team_broadcast_coupon` writes `GAME_TEAM_BROADCAST`.
- [ ] Team-wide invitation reaches 2 responses and writes exactly one `GAME_SOCIAL_MOMENT`.
- [ ] Ordinary direct social invitations do not write Team Dynamics entries.
- [ ] Team Dynamics write failures do not roll back lottery, life-ticket claim, boost settlement, social invitation creation, or social response.
