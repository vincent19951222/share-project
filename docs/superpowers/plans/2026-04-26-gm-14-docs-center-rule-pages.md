# GM-14 Docs Center Rule Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add maintainable `牛马补给站` rule, help, FAQ, and changelog content to the existing Docs Center, plus rule links from Supply Station.

**Architecture:** Keep all GM-14 content in a local `content/docs-center/gamification.ts` module with validation helpers and render it through a focused `GamificationDocsSection` component. Integrate the component into the existing Docs Center tabs and add lightweight links from `SupplyStation`; do not add database tables, APIs, CMS behavior, or new game rules.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Vitest + jsdom, local content modules.

---

## File Structure

- Create: `content/docs-center/gamification.ts`
  - Local gamification docs content, anchors, required rule facts, and validation helpers.
- Create: `components/docs-center/GamificationDocsSection.tsx`
  - Render rule blocks, help steps, FAQ, and changelog snippets from the local content module.
- Modify: `components/docs-center/DocsCenter.tsx`
  - Add the gamification docs section to the existing rules/help/FAQ content surfaces.
- Modify: `components/gamification/SupplyStation.tsx`
  - Add visible rule links to Docs Center anchors.
- Create: `__tests__/docs-center-gamification-content.test.ts`
  - Validate content shape, anchors, required facts, and FAQ coverage.
- Create: `__tests__/docs-center-gamification-section.test.tsx`
  - Render `GamificationDocsSection` and assert key rules appear.
- Modify: `__tests__/docs-center-page.test.tsx`
  - Assert `/docs` includes gamification rule content.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - Assert Supply Station links to `/docs?tab=rules#supply-station-rules`.

## Implementation Rules

- Do not implement the mainline Docs Center shell inside GM-14.
- Do not add Prisma models or migrations.
- Do not add public API routes.
- Do not fetch docs content from the database.
- Do not change lottery odds, item effects, ticket economics, redemption status machines, or weak social behavior.
- Do not put team event timeline content into Docs Center.
- Keep all rule numbers explicit in content and covered by tests.
- If the mainline Docs Center files are missing, stop GM-14 implementation and finish the Docs Center mainline story first.

---

### Task 1: Add Content Validation Tests

**Files:**
- Create: `__tests__/docs-center-gamification-content.test.ts`
- Create: `content/docs-center/gamification.ts`

- [ ] **Step 1: Verify the Docs Center mainline dependency exists**

Run:

```bash
test -f "app/(board)/docs/page.tsx"
test -f components/docs-center/DocsCenter.tsx
test -f components/docs-center/DocsTabs.tsx
test -f components/docs-center/DocsSection.tsx
```

Expected: all commands exit with code `0`. If any command fails, stop GM-14 and finish the mainline Docs Center story first.

- [ ] **Step 2: Write failing content tests**

Create `__tests__/docs-center-gamification-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  GAMIFICATION_REQUIRED_RULE_FACTS,
  gamificationDocs,
  getGamificationDocAnchors,
  validateGamificationDocs,
} from "@/content/docs-center/gamification";

describe("gamification docs content", () => {
  it("has stable docs center anchors", () => {
    expect(getGamificationDocAnchors()).toEqual({
      rules: "supply-station-rules",
      help: "supply-station-help",
      faq: "supply-station-faq",
      changelog: "supply-station-changelog",
    });
  });

  it("passes local validation", () => {
    expect(validateGamificationDocs()).toEqual([]);
  });

  it("keeps all required economic and behavior facts in the rules", () => {
    const facts = new Set(gamificationDocs.rules.flatMap((rule) => rule.facts));

    for (const fact of GAMIFICATION_REQUIRED_RULE_FACTS) {
      expect(facts.has(fact)).toBe(true);
    }
  });

  it("covers the confirmed FAQ topics", () => {
    const faqText = gamificationDocs.faq
      .map((item) => `${item.question}\n${item.answer}`)
      .join("\n");

    expect(faqText).toContain("每天最多");
    expect(faqText).toContain("十连");
    expect(faqText).toContain("永久有效");
    expect(faqText).toContain("健身请假券");
    expect(faqText).toContain("瑞幸咖啡券");
    expect(faqText).toContain("弱社交");
  });
});
```

- [ ] **Step 3: Run the content test and confirm it fails**

Run:

```bash
npm test -- __tests__/docs-center-gamification-content.test.ts
```

Expected: FAIL because `content/docs-center/gamification.ts` does not exist.

- [ ] **Step 4: Create the gamification docs content module**

Create `content/docs-center/gamification.ts`:

```ts
export type GamificationDocTone = "default" | "warning" | "success" | "highlight";

export interface GamificationRuleBlock {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  facts: string[];
  tone: GamificationDocTone;
}

export interface GamificationHelpStep {
  id: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface GamificationFaqItem {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export interface GamificationChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
  tags: string[];
}

export interface GamificationDocsContent {
  updatedAt: string;
  anchors: {
    rules: string;
    help: string;
    faq: string;
    changelog: string;
  };
  changelog: GamificationChangelogEntry;
  rules: GamificationRuleBlock[];
  help: GamificationHelpStep[];
  faq: GamificationFaqItem[];
}

export const GAMIFICATION_REQUIRED_RULE_FACTS = [
  "max_free_tickets_per_day=2",
  "fitness_ticket=1",
  "life_ticket_requires_all_four_dimensions",
  "tickets_never_expire",
  "items_never_expire",
  "single_draw_cost=1",
  "ten_draw_cost=10",
  "single_draw_no_guarantee",
  "ten_draw_has_guarantee",
  "ticket_price=40",
  "ten_draw_min_existing_tickets=7",
  "ten_draw_max_top_up=3",
  "paid_ticket_daily_limit=3",
  "boost_same_day_only",
  "boost_no_stacking",
  "leave_coupon_no_rewards",
  "weak_social_no_rewards",
  "luckin_admin_confirmation",
  "spent_resources_not_refunded",
] as const;

export const gamificationDocs: GamificationDocsContent = {
  updatedAt: "2026-04-26",
  anchors: {
    rules: "supply-station-rules",
    help: "supply-station-help",
    faq: "supply-station-faq",
    changelog: "supply-station-changelog",
  },
  changelog: {
    id: "supply-station-rules-2026-04-26",
    date: "2026-04-26",
    title: "牛马补给站规则说明上线",
    summary: "补齐每日任务、抽奖券、十连、背包、暴击、弱社交和瑞幸兑换的统一说明。",
    bullets: [
      "明确每天最多免费获得 2 张抽奖券：健身 1 张，四维全完成 1 张。",
      "明确十连可以用银子补齐，价格 40 银子 / 张，每天最多补 3 张。",
      "明确道具和抽奖券永久有效，已消耗资源不因撤销打卡自动返还。",
      "明确瑞幸咖啡券需要管理员线下确认，不自动生成咖啡打卡记录。",
    ],
    tags: ["牛马补给站", "规则", "抽奖", "背包"],
  },
  rules: [
    {
      id: "daily-free-tickets",
      title: "每天最多两张免费券",
      summary: "健身是主线，四维任务是补给；都做完，今天最多拿 2 张券。",
      bullets: [
        "完成当天真实健身打卡，获得 1 张健身券。",
        "完成当天四个维度任务，获得 1 张生活券。",
        "每天免费券上限是 2 张，只完成四维中的一部分不能领取生活券。",
        "健身券和生活券进入同一个抽奖券余额，不单独分包。",
        "抽奖券永久有效，可以攒着十连。",
      ],
      facts: [
        "max_free_tickets_per_day=2",
        "fitness_ticket=1",
        "life_ticket_requires_all_four_dimensions",
        "tickets_never_expire",
      ],
      tone: "highlight",
    },
    {
      id: "four-dimension-tasks",
      title: "四维摸鱼任务",
      summary: "把电充绿、把尿喝白、把事办黄、把股看红，本质是提醒自己照顾身体和状态。",
      bullets: [
        "四个维度固定为：把电充绿、把尿喝白、把事办黄、把股看红。",
        "每个维度每天抽 1 张任务卡，完成后手动点击完成。",
        "第一版采用信任型自报，不要求照片、定位、计时或审批。",
        "四维任务不是绩效系统，也不是强监管工具。",
      ],
      facts: ["life_ticket_requires_all_four_dimensions"],
      tone: "success",
    },
    {
      id: "lottery-and-ten-draw",
      title: "抽奖与十连",
      summary: "单抽靠运气，十连有保底；银子可以补齐，但不能无限买券。",
      bullets: [
        "单抽消耗 1 张券，没有保底。",
        "十连消耗 10 张券，至少保底 1 个实用道具、弱社交道具或稀有以上奖励。",
        "如果已有 7-9 张券，可以用银子补齐十连。",
        "补券价格是 40 银子 / 张，每天最多补 3 张。",
        "抽奖可能抽到银子，但长期期望低于购券成本，不能靠抽奖无限套利。",
      ],
      facts: [
        "single_draw_cost=1",
        "ten_draw_cost=10",
        "single_draw_no_guarantee",
        "ten_draw_has_guarantee",
        "ticket_price=40",
        "ten_draw_min_existing_tickets=7",
        "ten_draw_max_top_up=3",
        "paid_ticket_daily_limit=3",
      ],
      tone: "highlight",
    },
    {
      id: "backpack-and-consumption",
      title: "背包与消耗",
      summary: "抽到的东西先放背包；用掉就没了，别指望撤销时自动吐回来。",
      bullets: [
        "抽奖券、普通道具、真实福利券都永久有效。",
        "道具以背包库存展示，使用成功后库存减少。",
        "已消耗资源不会因为撤销打卡、取消操作或后悔而自动返还。",
        "涉及真实福利的兑换取消，只按兑换状态机返还库存。",
      ],
      facts: [
        "tickets_never_expire",
        "items_never_expire",
        "spent_resources_not_refunded",
      ],
      tone: "warning",
    },
    {
      id: "boost-rules",
      title: "今日生效与暴击",
      summary: "暴击只照顾今天的真实健身打卡，不跨天、不叠加、不被请假券触发。",
      bullets: [
        "收益类 boost 只作用于当天真实健身打卡。",
        "先用 boost 再健身，打卡时生效。",
        "先健身再用 boost，当天可以补结算。",
        "boost 不跨天自动延续。",
        "暴击类道具不可叠加。",
        "健身请假券不会触发任何 boost。",
      ],
      facts: ["boost_same_day_only", "boost_no_stacking", "leave_coupon_no_rewards"],
      tone: "highlight",
    },
    {
      id: "leave-coupon-rules",
      title: "健身请假券",
      summary: "请假券保护连续记录，不伪造健身成果。",
      bullets: [
        "使用健身请假券后，当天不算完成健身。",
        "当天不发健身券，不发银子，不推进赛季贡献。",
        "它只保护连续记录不断联，并冻结下一次真实健身打卡档位。",
        "如果今天本来能拿 40 银子，用请假券后今天不拿，明天真实健身仍按 40 档位结算。",
      ],
      facts: ["leave_coupon_no_rewards"],
      tone: "warning",
    },
    {
      id: "weak-social-rules",
      title: "弱社交点名",
      summary: "点名是轻提醒，不是抓人上班；可以响应，也可以忽略。",
      bullets: [
        "点名喝水、出门溜达、今日闲聊、红盘情报都属于轻提醒。",
        "被邀请人可以响应，也可以忽略。",
        "不响应不扣分、不影响收益。",
        "V1 弱社交响应不发银子、不发抽奖券、不推进赛季。",
        "企业微信只是提醒渠道，系统内仍以当天响应记录为准。",
      ],
      facts: ["weak_social_no_rewards"],
      tone: "default",
    },
    {
      id: "luckin-redemption-rules",
      title: "瑞幸咖啡券兑换",
      summary: "瑞幸券是真实福利，走申请和管理员确认，不自动变成咖啡打卡。",
      bullets: [
        "瑞幸咖啡券需要在背包里申请兑换。",
        "申请后库存立即扣减，避免同一张券重复申请。",
        "管理员确认后流程结束。",
        "管理员取消 REQUESTED 申请时返还库存。",
        "已确认兑换不自动生成咖啡打卡记录；实际喝咖啡后仍按正常咖啡页打卡。",
      ],
      facts: ["luckin_admin_confirmation"],
      tone: "success",
    },
    {
      id: "team-dynamics-boundary",
      title: "哪些事会进团队动态",
      summary: "团队动态只收高价值事件，不收普通流水。",
      bullets: [
        "稀有奖励、四维连续完成里程碑、boost 高光、团队小喇叭、多人响应可以进入团队动态。",
        "普通任务完成、普通抽奖、普通点名不会进入团队动态。",
        "规则说明属于文档中心，团队发生了什么属于团队动态。",
      ],
      facts: [],
      tone: "default",
    },
  ],
  help: [
    {
      id: "daily-flow",
      title: "每天怎么用牛马补给站",
      description: "先健身，再补四维，最后看手气。顺序不强制，但这个顺序最不容易忘。",
      bullets: [
        "进入牛马补给站，先看今天四个维度分别抽到了什么任务。",
        "完成真实健身打卡，领取 1 张健身券。",
        "把四个维度都点完成，领取 1 张生活券。",
        "攒够券后可以单抽或十连，抽到的道具进背包。",
        "需要暴击时，先在背包使用今日生效道具，再完成或补结算当天健身。",
      ],
    },
    {
      id: "how-to-read-backpack",
      title: "怎么看背包",
      description: "背包是你的补给库存，不是待办清单。",
      bullets: [
        "数量代表你当前还剩多少个同类道具。",
        "收益类道具通常绑定当天真实健身打卡。",
        "弱社交道具使用后会创建当天邀请。",
        "瑞幸咖啡券需要申请兑换并等待管理员确认。",
      ],
    },
    {
      id: "when-to-check-docs",
      title: "什么时候该看规则",
      description: "抽奖前、用暴击前、兑换真实福利前，都建议先扫一眼规则。",
      bullets: [
        "不确定券怎么来的，看每日免费券规则。",
        "不确定十连差几张券，看抽奖与十连规则。",
        "不确定道具会不会返还，看背包与消耗规则。",
        "不确定瑞幸怎么拿，看兑换规则。",
      ],
    },
  ],
  faq: [
    {
      id: "faq-max-free-tickets",
      question: "一天最多能免费拿几张抽奖券？",
      answer: "最多 2 张。真实健身打卡 1 张，四维任务全部完成 1 张。",
      tags: ["tickets", "daily"],
    },
    {
      id: "faq-partial-tasks",
      question: "四维任务只完成一两个，能拿生活券吗？",
      answer: "不能。生活券要求把电充绿、把尿喝白、把事办黄、把股看红四个维度都完成。",
      tags: ["tasks", "tickets"],
    },
    {
      id: "faq-ten-draw-top-up",
      question: "十连差几张券，可以用银子补吗？",
      answer: "可以，但你必须已有至少 7 张券，最多补 3 张，价格是 40 银子 / 张。",
      tags: ["lottery", "coins"],
    },
    {
      id: "faq-expiry",
      question: "抽奖券和道具会过期吗？",
      answer: "不会。抽奖券、普通道具和真实福利券都是永久有效。",
      tags: ["backpack"],
    },
    {
      id: "faq-spent-resource",
      question: "我用了道具又撤销打卡，道具会返还吗？",
      answer: "不会。已花掉的资源不因为撤销打卡自动返还，系统会在关键操作前提示。",
      tags: ["backpack", "undo"],
    },
    {
      id: "faq-leave-coupon",
      question: "健身请假券算健身吗？",
      answer: "不算。它不发健身券、不发银子、不推进赛季，只保护连续记录不断联。",
      tags: ["leave", "fitness"],
    },
    {
      id: "faq-weak-social",
      question: "弱社交点名不响应会怎么样？",
      answer: "不会怎么样。弱社交是轻提醒，不响应不扣分、不影响收益，V1 响应也不发奖励。",
      tags: ["social"],
    },
    {
      id: "faq-luckin",
      question: "瑞幸咖啡券怎么兑换？",
      answer: "在背包里申请兑换，申请后库存扣减；管理员线下处理并确认。确认后不会自动生成咖啡打卡。",
      tags: ["redemption", "luckin"],
    },
    {
      id: "faq-team-dynamics",
      question: "为什么我普通抽奖没有进团队动态？",
      answer: "团队动态只沉淀高价值事件。普通任务、普通抽奖、普通点名不写团队动态。",
      tags: ["dynamics"],
    },
  ],
};

export function getGamificationDocAnchors() {
  return gamificationDocs.anchors;
}

export function validateGamificationDocs(content = gamificationDocs) {
  const errors: string[] = [];
  const ids = [
    ...content.rules.map((item) => item.id),
    ...content.help.map((item) => item.id),
    ...content.faq.map((item) => item.id),
    content.changelog.id,
    ...Object.values(content.anchors),
  ];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(`Duplicate gamification docs id: ${id}`);
    }
    seen.add(id);
  }

  const facts = new Set(content.rules.flatMap((rule) => rule.facts));
  for (const fact of GAMIFICATION_REQUIRED_RULE_FACTS) {
    if (!facts.has(fact)) {
      errors.push(`Missing gamification docs fact: ${fact}`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(content.updatedAt)) {
    errors.push("updatedAt must use YYYY-MM-DD format");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(content.changelog.date)) {
    errors.push("changelog.date must use YYYY-MM-DD format");
  }

  return errors;
}
```

- [ ] **Step 5: Run the content test and confirm it passes**

Run:

```bash
npm test -- __tests__/docs-center-gamification-content.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit content foundation**

```bash
git add __tests__/docs-center-gamification-content.test.ts content/docs-center/gamification.ts
git commit -m "feat: add gamification docs content"
```

---

### Task 2: Render the Gamification Docs Section

**Files:**
- Create: `__tests__/docs-center-gamification-section.test.tsx`
- Create: `components/docs-center/GamificationDocsSection.tsx`

- [ ] **Step 1: Write failing component tests**

Create `__tests__/docs-center-gamification-section.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GamificationDocsSection } from "@/components/docs-center/GamificationDocsSection";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("GamificationDocsSection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders rules, help, faq, and changelog content", () => {
    act(() => {
      root.render(<GamificationDocsSection />);
    });

    expect(container.textContent).toContain("牛马补给站规则说明上线");
    expect(container.textContent).toContain("每天最多两张免费券");
    expect(container.textContent).toContain("十连消耗 10 张券");
    expect(container.textContent).toContain("价格是 40 银子 / 张");
    expect(container.textContent).toContain("健身请假券");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("弱社交");
  });

  it("renders stable anchors for docs deep links", () => {
    act(() => {
      root.render(<GamificationDocsSection />);
    });

    expect(container.querySelector("#supply-station-rules")).not.toBeNull();
    expect(container.querySelector("#supply-station-help")).not.toBeNull();
    expect(container.querySelector("#supply-station-faq")).not.toBeNull();
    expect(container.querySelector("#supply-station-changelog")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the component test and confirm it fails**

Run:

```bash
npm test -- __tests__/docs-center-gamification-section.test.tsx
```

Expected: FAIL because `GamificationDocsSection` does not exist.

- [ ] **Step 3: Create the render component**

Create `components/docs-center/GamificationDocsSection.tsx`:

```tsx
import { gamificationDocs } from "@/content/docs-center/gamification";

export function GamificationDocsSection() {
  return (
    <section className="docs-gamification" aria-labelledby="supply-station-docs-title">
      <div className="docs-gamification__header">
        <p className="docs-eyebrow">牛马补给站</p>
        <h2 id="supply-station-docs-title">补给站玩法规则</h2>
        <p>
          把每日任务、抽奖券、十连、背包、暴击、弱社交和瑞幸兑换放在同一页。
          规则可以搞笑，但数字不能糊。
        </p>
        <p className="docs-updated">最后更新：{gamificationDocs.updatedAt}</p>
      </div>

      <article id={gamificationDocs.anchors.changelog} className="docs-block docs-block--highlight">
        <p className="docs-eyebrow">更新日志</p>
        <h3>{gamificationDocs.changelog.title}</h3>
        <p>{gamificationDocs.changelog.summary}</p>
        <ul>
          {gamificationDocs.changelog.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>

      <div id={gamificationDocs.anchors.rules} className="docs-gamification__rules">
        <p className="docs-eyebrow">玩法规则</p>
        {gamificationDocs.rules.map((rule) => (
          <article id={rule.id} key={rule.id} className={`docs-block docs-block--${rule.tone}`}>
            <h3>{rule.title}</h3>
            <p>{rule.summary}</p>
            <ul>
              {rule.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div id={gamificationDocs.anchors.help} className="docs-gamification__help">
        <p className="docs-eyebrow">使用说明</p>
        {gamificationDocs.help.map((step) => (
          <article id={step.id} key={step.id} className="docs-block">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <ul>
              {step.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div id={gamificationDocs.anchors.faq} className="docs-gamification__faq">
        <p className="docs-eyebrow">常见问题</p>
        {gamificationDocs.faq.map((item) => (
          <details id={item.id} key={item.id} className="docs-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the component test and confirm it passes**

Run:

```bash
npm test -- __tests__/docs-center-gamification-section.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the render component**

```bash
git add __tests__/docs-center-gamification-section.test.tsx components/docs-center/GamificationDocsSection.tsx
git commit -m "feat: render gamification docs section"
```

---

### Task 3: Integrate Gamification Content Into Docs Center

**Files:**
- Modify: `components/docs-center/DocsCenter.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/docs-center-page.test.tsx`

- [ ] **Step 1: Add failing Docs Center page test**

Extend `__tests__/docs-center-page.test.tsx`:

```tsx
it("shows gamification rules inside the docs center", () => {
  act(() => {
    root.render(<DocsCenter />);
  });

  expect(container.textContent).toContain("补给站玩法规则");
  expect(container.textContent).toContain("每天最多两张免费券");
  expect(container.textContent).toContain("十连消耗 10 张券");
  expect(container.querySelector("#supply-station-rules")).not.toBeNull();
});
```

- [ ] **Step 2: Run the Docs Center page test and confirm it fails**

Run:

```bash
npm test -- __tests__/docs-center-page.test.tsx
```

Expected: FAIL because `DocsCenter` does not render the gamification section yet.

- [ ] **Step 3: Mount the gamification section in Docs Center**

Modify `components/docs-center/DocsCenter.tsx`:

```tsx
import { GamificationDocsSection } from "@/components/docs-center/GamificationDocsSection";
```

Place the component after the existing core rules/help/FAQ sections:

```tsx
<GamificationDocsSection />
```

If the mainline Docs Center renders one tab at a time, render the section in the rules tab and keep its internal help/FAQ blocks visible below the rules. This keeps GM-14 as one coherent game-rule page instead of scattering content across unrelated files.

- [ ] **Step 4: Add lightweight styles**

Modify `app/globals.css`:

```css
.docs-gamification {
  display: grid;
  gap: 1rem;
}

.docs-gamification__header,
.docs-block,
.docs-faq-item {
  border: 2px solid #1f2937;
  background: #fff7d6;
  box-shadow: 4px 4px 0 #1f2937;
  border-radius: 18px;
  padding: 1rem;
}

.docs-block--highlight {
  background: #fde047;
}

.docs-block--success {
  background: #dcfce7;
}

.docs-block--warning {
  background: #ffedd5;
}

.docs-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #92400e;
}

.docs-updated {
  color: #6b7280;
  font-size: 0.88rem;
}

.docs-faq-item summary {
  cursor: pointer;
  font-weight: 800;
}
```

- [ ] **Step 5: Run Docs Center page test**

Run:

```bash
npm test -- __tests__/docs-center-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Docs Center integration**

```bash
git add components/docs-center/DocsCenter.tsx app/globals.css __tests__/docs-center-page.test.tsx
git commit -m "feat: add supply station docs to docs center"
```

---

### Task 4: Link Supply Station to Rule Pages

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Add failing Supply Station link test**

Extend `__tests__/supply-station-shell.test.tsx`:

```tsx
it("links to the supply station docs rules", async () => {
  await act(async () => {
    root.render(<SupplyStation />);
  });

  const ruleLink = Array.from(container.querySelectorAll("a")).find((link) =>
    link.textContent?.includes("玩法规则"),
  );

  expect(ruleLink).toBeDefined();
  expect(ruleLink?.getAttribute("href")).toBe("/docs?tab=rules#supply-station-rules");
});
```

- [ ] **Step 2: Run the Supply Station shell test and confirm it fails**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: FAIL because `SupplyStation` does not link to the docs rules yet.

- [ ] **Step 3: Add rule links to Supply Station**

Modify `components/gamification/SupplyStation.tsx` near the page header:

```tsx
<a className="supply-rule-link" href="/docs?tab=rules#supply-station-rules">
  玩法规则
</a>
```

Add contextual links where the sections exist:

```tsx
<a className="supply-inline-link" href="/docs?tab=rules#lottery-and-ten-draw">
  查看抽奖规则
</a>
<a className="supply-inline-link" href="/docs?tab=rules#backpack-and-consumption">
  查看道具规则
</a>
<a className="supply-inline-link" href="/docs?tab=rules#luckin-redemption-rules">
  查看兑换规则
</a>
```

If the current section UI does not yet have lottery, backpack, or redemption panels, only add the header `玩法规则` link in GM-14 and leave contextual links to the story that owns each panel.

- [ ] **Step 4: Add link styles**

Modify `app/globals.css`:

```css
.supply-rule-link,
.supply-inline-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border: 2px solid #1f2937;
  background: #fef3c7;
  color: #1f2937;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 3px 3px 0 #1f2937;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
}

.supply-rule-link:active,
.supply-inline-link:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #1f2937;
}
```

- [ ] **Step 5: Run Supply Station shell test**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Supply Station links**

```bash
git add components/gamification/SupplyStation.tsx app/globals.css __tests__/supply-station-shell.test.tsx
git commit -m "feat: link supply station to docs rules"
```

---

### Task 5: Verify Full Docs and Game Regression

**Files:**
- No new source files.

- [ ] **Step 1: Run focused GM-14 tests**

Run:

```bash
npm test -- \
  __tests__/docs-center-gamification-content.test.ts \
  __tests__/docs-center-gamification-section.test.tsx \
  __tests__/docs-center-page.test.tsx \
  __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 3: Check docs content manually in the browser**

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/docs?tab=rules#supply-station-rules
```

Expected:

- The docs page loads after login.
- The `补给站玩法规则` section is visible.
- The page includes rules for daily tickets, four dimensions, ten draw, backpack, boost, leave coupon, weak social, Luckin redemption, and Team Dynamics boundary.
- Mobile width remains readable without horizontal overflow.

- [ ] **Step 4: Commit verification-only fixes if needed**

If manual browser inspection exposes a visual defect, fix the smallest CSS or markup issue, then run:

```bash
npm test -- __tests__/docs-center-gamification-section.test.tsx __tests__/docs-center-page.test.tsx
npm run lint
```

Expected: PASS.

Commit any verification fix:

```bash
git add components/docs-center/GamificationDocsSection.tsx components/docs-center/DocsCenter.tsx app/globals.css
git commit -m "fix: polish supply station docs layout"
```

---

## Acceptance Checklist

- [ ] Mainline Docs Center exists before GM-14 starts.
- [ ] `content/docs-center/gamification.ts` contains changelog, rules, help, and FAQ content.
- [ ] Content validation covers all required facts.
- [ ] Docs Center renders `补给站玩法规则`.
- [ ] Supply Station links to `/docs?tab=rules#supply-station-rules`.
- [ ] Rules cover daily tickets, four dimensions, lottery, ten draw, backpack, boost, leave coupon, weak social, Luckin redemption, and Team Dynamics boundary.
- [ ] No database schema, API route, economy rule, lottery probability, item effect, or redemption state machine changes are introduced by GM-14.
