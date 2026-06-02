export type DrinkId = "water" | "milkTea" | "americano" | "latte" | "other";

export type DrinkEvent = {
  id: number;
  drinkId: DrinkId;
  time: string;
  note: string;
};

export const drinkNoteOptions = [
  "早起一杯，清醒一下！",
  "把水杯放回视线里",
  "加油干！",
  "奶茶续命，快乐加倍～",
  "会议前补一口",
  "少冰少内耗",
  "下午用奶泡顶住",
  "喝完这杯，继续搬砖",
];

export function pickDrinkNote(seed = Math.floor(Math.random() * drinkNoteOptions.length)) {
  const index = ((seed % drinkNoteOptions.length) + drinkNoteOptions.length) % drinkNoteOptions.length;

  return drinkNoteOptions[index];
}

export function buildDrinkEvent(event: DrinkEvent): DrinkEvent {
  return {
    ...event,
    note: event.note.trim() || pickDrinkNote(),
  };
}
