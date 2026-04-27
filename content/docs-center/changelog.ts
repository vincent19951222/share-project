import type { DocsChangelogEntry } from "./types";

export const docsChangelog: DocsChangelogEntry[] = [
  {
    id: "docs-center-launch",
    date: "2026-04-27",
    title: "文档中心上线",
    summary: "把更新日志、规则、使用说明和 FAQ 集中到一个入口里。",
    bullets: [
      "Profile 下拉新增文档中心入口，方便从主面板直接进入。",
      "首版提供四个一级栏目，既能切换内容，也能按锚点直达。",
      "更新日志和赛季规则先落真实内容，帮助和 FAQ 先给基础解释。",
    ],
    tags: ["docs", "mvp"],
  },
  {
    id: "team-dynamics-separation",
    date: "2026-04-26",
    title: "团队动态和说明内容分层",
    summary: "产品说明不再混进事件时间线，统一收口到文档中心。",
    bullets: [
      "团队动态只记录事件、里程碑和周报高光。",
      "规则解释、操作说明和常见误解都进入文档中心。",
      "减少不同页面之间口径不一致的问题。",
    ],
    tags: ["dynamics"],
  },
  {
    id: "calendar-coffee-stable",
    date: "2026-04-23",
    title: "日历和咖啡能力稳定",
    summary: "主面板开始承接更多日常节奏，说明内容也需要统一入口。",
    bullets: [
      "日历视图让打卡记录更容易回看。",
      "续命咖啡和轻量统计开始有稳定展示位置。",
      "移动端阅读体验补齐后，说明页面更适合集中维护。",
    ],
    tags: ["calendar", "coffee"],
  },
  {
    id: "season-economy-foundation",
    date: "2026-04-22",
    title: "赛季与资产口径统一",
    summary: "我的银子、牛马金库和赛季收入开始采用同一套解释。",
    bullets: [
      "长期资产和赛季贡献拆成两个口径，避免混用。",
      "冲刺条正式作为团队赛季进度的可视化表达。",
      "后续所有规则页都以这套口径为准。",
    ],
    tags: ["season", "economy"],
  },
];
