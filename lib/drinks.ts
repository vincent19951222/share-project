export const DRINK_TYPES = ["water", "milkTea", "americano", "latte", "other"] as const;

export type DrinkType = (typeof DRINK_TYPES)[number];

export interface DrinkCatalogItem {
  type: DrinkType;
  label: string;
  asset: string;
  color: string;
  softColor: string;
  textColor: string;
}

export const drinkCatalog: Record<DrinkType, DrinkCatalogItem> = {
  water: {
    type: "water",
    label: "水",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-water.png",
    color: "#4fb8d6",
    softColor: "#e8f8fc",
    textColor: "#0087a6",
  },
  milkTea: {
    type: "milkTea",
    label: "奶茶",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-milk-tea.png",
    color: "#ef7f8f",
    softColor: "#fff1ee",
    textColor: "#e96f83",
  },
  americano: {
    type: "americano",
    label: "美式",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-americano.png",
    color: "#7a5438",
    softColor: "#fff3df",
    textColor: "#76411f",
  },
  latte: {
    type: "latte",
    label: "拿铁",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-latte.png",
    color: "#ef9d36",
    softColor: "#fff4dd",
    textColor: "#e4841b",
  },
  other: {
    type: "other",
    label: "其他",
    asset: "/assets/ui-prototypes/drink-update/generated/drink-other.png",
    color: "#8f948e",
    softColor: "#f4f3ed",
    textColor: "#555555",
  },
};

export function isDrinkType(value: unknown): value is DrinkType {
  return typeof value === "string" && (DRINK_TYPES as readonly string[]).includes(value);
}

export function normalizeDrinkNote(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().slice(0, 80);
  return trimmed.length > 0 ? trimmed : null;
}
