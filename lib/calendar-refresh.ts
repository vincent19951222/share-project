export const CALENDAR_REFRESH_EVENT = "calendar:refresh";

export function dispatchCalendarRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));
}
