import { describe, expect, it } from "vitest";
import {
  GAMIFICATION_REQUIRED_RULE_FACTS,
  gamificationDocs,
  getGamificationDocAnchors,
  validateGamificationDocs,
} from "@/content/docs-center/gamification";

describe("gamification docs content", () => {
  it("has stable docs center anchors", () => {
    expect(getGamificationDocAnchors()).toEqual({
      rules: "supply-station-rules",
      help: "supply-station-help",
      faq: "supply-station-faq",
      changelog: "supply-station-changelog",
    });
  });

  it("passes local validation", () => {
    expect(validateGamificationDocs()).toEqual([]);
  });

  it("keeps all required economic and behavior facts in the rules", () => {
    const facts = new Set(gamificationDocs.rules.flatMap((rule) => rule.facts));

    for (const fact of GAMIFICATION_REQUIRED_RULE_FACTS) {
      expect(facts.has(fact)).toBe(true);
    }
  });

  it("covers the confirmed FAQ topics", () => {
    const faqText = gamificationDocs.faq
      .map((item) => `${item.question}\n${item.answer}`)
      .join("\n");

    expect(faqText).toContain("每天最多");
    expect(faqText).toContain("十连");
    expect(faqText).toContain("永久有效");
    expect(faqText).toContain("健身请假券");
    expect(faqText).toContain("瑞幸咖啡券");
    expect(faqText).toContain("弱社交");
  });
});
