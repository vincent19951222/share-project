import { describe, expect, it } from "vitest";
import { docsChangelog } from "@/content/docs-center/changelog";
import { docsFaq } from "@/content/docs-center/faq";
import { docsHelp } from "@/content/docs-center/help";
import { docsRules } from "@/content/docs-center/rules";
import { docsTabs } from "@/content/docs-center/types";

describe("docs center content", () => {
  it("ships the four tabs, reverse-chronological changelog, and real rule copy", () => {
    expect(docsTabs.map((tab) => tab.id)).toEqual([
      "changelog",
      "rules",
      "help",
      "faq",
    ]);

    expect(docsChangelog.map((entry) => entry.date)).toEqual([
      "2026-04-27",
      "2026-04-26",
      "2026-04-23",
      "2026-04-22",
    ]);

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
