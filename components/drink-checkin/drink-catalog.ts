import { DRINK_TYPES, drinkCatalog } from "@/lib/drinks";

export const drinkItems = DRINK_TYPES.map((type) => ({
  ...drinkCatalog[type],
  unit: "杯",
}));
