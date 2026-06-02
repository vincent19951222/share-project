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

export function getCurrentDrinkEntryTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}
