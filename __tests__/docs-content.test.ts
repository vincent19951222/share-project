import { describe, expect, it } from "vitest";
import { docsChangelog } from "@/content/docs-center/changelog";
import { docsFaq } from "@/content/docs-center/faq";
import { docsHelp } from "@/content/docs-center/help";
import { docsRules } from "@/content/docs-center/rules";
import { docsTabs } from "@/content/docs-center/tabs";

function isDescendingDates(dates: string[]): boolean {
  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index - 1] < dates[index]) {
      return false;
    }
  }

  return true;
}

function containsDatesInOrder(dates: string[], expectedDates: string[]): boolean {
  let searchFrom = 0;

  for (const expectedDate of expectedDates) {
    const foundIndex = dates.indexOf(expectedDate, searchFrom);

    if (foundIndex === -1) {
      return false;
    }

    searchFrom = foundIndex + 1;
  }

  return true;
}

describe("docs center content", () => {
  it("ships the four tabs, reverse-chronological changelog, and real rule copy", () => {
    expect(docsTabs.map((tab) => tab.id)).toEqual([
      "changelog",
      "rules",
      "help",
      "faq",
    ]);

    const dates = docsChangelog.map((entry) => entry.date);

    expect(isDescendingDates(dates)).toBe(true);
    expect(
      containsDatesInOrder(dates, [
        "2026-04-27",
        "2026-04-26",
        "2026-04-23",
        "2026-04-22",
      ]),
    ).toBe(true);

    expect(docsRules.map((section) => section.id)).toEqual([
      "balance",
      "vault",
      "season-progress",
      "season-lifecycle",
    ]);

    expect(docsRules[0]?.bullets.length).toBeGreaterThan(1);
    expect(docsHelp.length).toBeGreaterThanOrEqual(3);
    expect(docsFaq.length).toBeGreaterThanOrEqual(4);
  });
});
