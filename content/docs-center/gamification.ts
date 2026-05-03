import { GAMIFICATION_PROBABILITY_REQUIRED_FACTS } from "@/lib/gamification/probability-disclosure";

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
  "ten_draw_max_top_up=10",
  "paid_ticket_daily_limit=10",
  "boost_same_day_only",
  "boost_no_stacking",
  "leave_coupon_no_rewards",
  "weak_social_no_rewards",
  "luckin_admin_confirmation",
  "spent_resources_not_refunded",
  ...GAMIFICATION_PROBABILITY_REQUIRED_FACTS,
] as const;

export const gamificationDocs: GamificationDocsContent = {
  updatedAt: "2026-05-02",
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
      "明确十连可以用银子补齐，价格 40 银子 / 张，每天最多补 10 张。",
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
        "十连优先消耗已有抽奖券，不足 10 张时可以用银子补齐。",
        "补券价格是 40 银子 / 张，每天最多补 10 张。",
        "抽奖可能抽到银子，但长期期望低于购券成本，不能靠抽奖无限套利。",
      ],
      facts: [
        "single_draw_cost=1",
        "ten_draw_cost=10",
        "single_draw_no_guarantee",
        "ten_draw_has_guarantee",
        "ticket_price=40",
        "ten_draw_max_top_up=10",
        "paid_ticket_daily_limit=10",
      ],
      tone: "highlight",
    },
    {
      id: "lottery-probability-rules",
      title: "抽奖概率说明",
      summary: "当前 active 奖池总权重是 100，权重可以直接近似理解为长期概率百分比。",
      bullets: [
        "当前 active 奖池总权重为 100。",
        "分层权重为：coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4。",
        "当前直接银子期望是 8.75 银子。",
        "disabled rewards 不会被抽到，未接入使用闭环的道具也不进入 active 奖池。",
      ],
      facts: [...GAMIFICATION_PROBABILITY_REQUIRED_FACTS],
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
      answer: "每天最多 2 张。真实健身打卡 1 张，四维任务全部完成 1 张。",
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
      answer: "可以。十连优先用已有抽奖券，不足 10 张时按 40 银子 / 张补齐，每人每天最多补 10 张。",
      tags: ["lottery", "coins"],
    },
    {
      id: "faq-expiry",
      question: "抽奖券和道具会过期吗？",
      answer: "不会。抽奖券、普通道具和真实福利券都永久有效。",
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
    ...Object.values(content.anchors),
    content.changelog.id,
    ...content.rules.map((item) => item.id),
    ...content.help.map((item) => item.id),
    ...content.faq.map((item) => item.id),
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

  for (const [key, value] of Object.entries(content.anchors)) {
    if (!value.startsWith("supply-station-")) {
      errors.push(`Unexpected gamification docs anchor for ${key}: ${value}`);
    }
  }

  return errors;
}
