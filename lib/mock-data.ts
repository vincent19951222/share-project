import { Member, CellStatus, ActivityLog } from "./types";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createMembers(avatarSvgs: Record<string, string>): Member[] {
  const keys = ["alen", "bob", "cindy", "dave", "eva"] as const;
  const names = ["Alen", "Bob", "Cindy", "Dave", "Eva"];
  return keys.map((key, i) => ({
    id: String.fromCharCode(65 + i),
    name: names[i],
    avatarSvg: avatarSvgs[key] || "",
  }));
}

export function initGridData(
  memberCount: number,
  today: number,
  totalDays: number
): CellStatus[][] {
  const rand = seededRandom(42);
  const grid: CellStatus[][] = [];
  for (let i = 0; i < memberCount; i++) {
    const row: CellStatus[] = [];
    for (let day = 1; day <= totalDays; day++) {
      if (day < today) {
        row.push(rand() > 0.2);
      } else if (day === today) {
        row.push(i === 0 || i === 1 ? false : true);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

export function createSeedLog(): ActivityLog {
  return {
    id: "seed-1",
    text: "WebSocket Connection Established. [Realtime Engine Active]",
    type: "system",
    timestamp: new Date(),
  };
}
