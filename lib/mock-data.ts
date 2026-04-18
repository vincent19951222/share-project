// lib/mock-data.ts
// 仅保留 seededRandom 工具函数，供 seed 脚本使用
// 其他函数已由 Prisma + DB 数据替代

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
