import type { DimensionDefinition } from "./types";

export const GAMIFICATION_DIMENSIONS: DimensionDefinition[] = [
  {
    key: "movement",
    title: "把电充绿",
    subtitle: "站一站，不然屁股长根",
    description: "起身、走动、拉伸、短暂恢复。",
  },
  {
    key: "hydration",
    title: "把尿喝白",
    subtitle: "喝白白，别把自己腌入味",
    description: "补水、接水、无糖饮品。",
  },
  {
    key: "social",
    title: "把事办黄",
    subtitle: "聊两句，让班味散一散",
    description: "闲聊、吐槽、夸夸、情绪释放。",
  },
  {
    key: "learning",
    title: "把股看红",
    subtitle: "看一点，给脑子补仓",
    description: "信息输入、学习、看新闻、文章或工具。",
  },
];
