export type DocsTabId = "changelog" | "rules" | "help" | "faq";

export interface DocsTabDefinition {
  id: DocsTabId;
  label: string;
  description: string;
}

export interface DocsChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
  tags?: string[];
}

export interface DocsSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  note?: string;
}

export const docsTabs: DocsTabDefinition[] = [
  {
    id: "changelog",
    label: "更新日志",
    description: "最近改了什么，老用户先看这里。",
  },
  {
    id: "rules",
    label: "赛季规则",
    description: "统一解释银子、金库、收入和冲刺条。",
  },
  {
    id: "help",
    label: "使用说明",
    description: "第一次上手时，先看这一栏。",
  },
  {
    id: "faq",
    label: "常见问题",
    description: "把最容易误会的点直接讲清楚。",
  },
];
