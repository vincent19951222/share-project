export interface SeasonTheme {
  month: number;
  panelBackground: string;
  accentColor: string;
  emptySlotColor: string;
  memberColors: readonly [string, string, string, string, string];
}

type SeasonThemeMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const SEASON_THEMES: Record<SeasonThemeMonth, SeasonTheme> = {
  1: {
    month: 1,
    panelBackground: "#fff1f2",
    accentColor: "#e11d48",
    emptySlotColor: "#fecdd3",
    memberColors: ["#be123c", "#e11d48", "#fb7185", "#f97316", "#fb923c"],
  },
  2: {
    month: 2,
    panelBackground: "#fff7ed",
    accentColor: "#ea580c",
    emptySlotColor: "#fed7aa",
    memberColors: ["#c2410c", "#ea580c", "#fb923c", "#f97316", "#facc15"],
  },
  3: {
    month: 3,
    panelBackground: "#f7fee7",
    accentColor: "#65a30d",
    emptySlotColor: "#d9f99d",
    memberColors: ["#4d7c0f", "#65a30d", "#84cc16", "#22c55e", "#16a34a"],
  },
  4: {
    month: 4,
    panelBackground: "#fffbeb",
    accentColor: "#d97706",
    emptySlotColor: "#fde68a",
    memberColors: ["#b45309", "#d97706", "#f59e0b", "#f97316", "#ef4444"],
  },
  5: {
    month: 5,
    panelBackground: "#ecfeff",
    accentColor: "#0891b2",
    emptySlotColor: "#a5f3fc",
    memberColors: ["#155e75", "#0891b2", "#06b6d4", "#14b8a6", "#0f766e"],
  },
  6: {
    month: 6,
    panelBackground: "#eff6ff",
    accentColor: "#2563eb",
    emptySlotColor: "#bfdbfe",
    memberColors: ["#1d4ed8", "#2563eb", "#3b82f6", "#0ea5e9", "#0284c7"],
  },
  7: {
    month: 7,
    panelBackground: "#eef2ff",
    accentColor: "#4f46e5",
    emptySlotColor: "#c7d2fe",
    memberColors: ["#3730a3", "#4f46e5", "#6366f1", "#8b5cf6", "#7c3aed"],
  },
  8: {
    month: 8,
    panelBackground: "#faf5ff",
    accentColor: "#9333ea",
    emptySlotColor: "#e9d5ff",
    memberColors: ["#7e22ce", "#9333ea", "#a855f7", "#c084fc", "#ec4899"],
  },
  9: {
    month: 9,
    panelBackground: "#fff1f2",
    accentColor: "#db2777",
    emptySlotColor: "#fbcfe8",
    memberColors: ["#be185d", "#db2777", "#ec4899", "#f43f5e", "#fb7185"],
  },
  10: {
    month: 10,
    panelBackground: "#fff7ed",
    accentColor: "#c2410c",
    emptySlotColor: "#fdba74",
    memberColors: ["#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"],
  },
  11: {
    month: 11,
    panelBackground: "#f8fafc",
    accentColor: "#475569",
    emptySlotColor: "#cbd5e1",
    memberColors: ["#334155", "#475569", "#64748b", "#0f766e", "#0284c7"],
  },
  12: {
    month: 12,
    panelBackground: "#ecfeff",
    accentColor: "#0f766e",
    emptySlotColor: "#99f6e4",
    memberColors: ["#115e59", "#0f766e", "#14b8a6", "#06b6d4", "#0ea5e9"],
  },
};

function cloneSeasonTheme(theme: SeasonTheme): SeasonTheme {
  return {
    month: theme.month,
    panelBackground: theme.panelBackground,
    accentColor: theme.accentColor,
    emptySlotColor: theme.emptySlotColor,
    memberColors: [...theme.memberColors] as SeasonTheme["memberColors"],
  };
}

export function getSeasonTheme(month: number): SeasonTheme {
  if (!isSeasonThemeMonth(month)) {
    throw new RangeError(`Invalid month: ${month}. Expected an integer from 1 to 12.`);
  }

  return cloneSeasonTheme(SEASON_THEMES[month]);
}

function isSeasonThemeMonth(month: number): month is SeasonThemeMonth {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}
