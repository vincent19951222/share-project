import type { DocsSection } from "./types";

export const docsFaq: DocsSection[] = [
  {
    id: "why-no-sprint",
    title: "为什么今天打卡了但冲刺条没再涨？",
    summary: "冲刺条看的是团队赛季进度，不是每次点击都立刻跳。",
    bullets: [
      "如果今天的有效打卡已经结算过，再点一次不会重复加成。",
      "冲刺条是团队维度的进度条，不是每个人单独的累加器。",
    ],
  },
  {
    id: "no-season-balance",
    title: "为什么没有赛季也能获得银子？",
    summary: "银子是长期个人资产，不依赖当前是否正在跑赛季。",
    bullets: [
      "没有赛季时，基础打卡仍然可以累计个人银子。",
      "赛季只是把团队进度单独算一套，不会拦住个人资产增长。",
    ],
  },
  {
    id: "vault-wallet",
    title: "牛马金库是不是公共钱包？",
    summary: "不是，它是团队累计贡献的展示口径。",
    bullets: [
      "金库不会直接变成某个人能随便花的余额。",
      "它更像团队一起往前推进的记分板，而不是零钱包。",
    ],
  },
  {
    id: "docs-dropdown",
    title: "为什么文档中心放在下拉里？",
    summary: "它是说明型内容入口，不抢主导航位置。",
    bullets: [
      "主导航留给最常用的打卡和看板操作。",
      "文档中心适合在需要解释规则时再打开。",
    ],
  },
];
