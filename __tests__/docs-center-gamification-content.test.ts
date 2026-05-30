import { describe, expect, it } from "vitest";
import {
  GAMIFICATION_REQUIRED_RULE_FACTS,
  gamificationDocs,
  getGamificationDocAnchors,
  validateGamificationDocs,
} from "@/content/docs-center/gamification";
import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import { GAMIFICATION_PROBABILITY_REQUIRED_FACTS } from "@/lib/gamification/probability-disclosure";

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

  it("keeps probability disclosure facts in the rules", () => {
    const facts = new Set(gamificationDocs.rules.flatMap((rule) => rule.facts));

    for (const fact of GAMIFICATION_PROBABILITY_REQUIRED_FACTS) {
      expect(facts.has(fact)).toBe(true);
    }
  });

  it("documents every enabled four-dimension task card from the content config", () => {
    const documentedCards = gamificationDocs.taskCardGroups.flatMap((group) => group.cards);
    const enabledCards = TASK_CARDS.filter((card) => card.enabled);

    expect(gamificationDocs.taskCardGroups.map((group) => group.dimensionKey)).toEqual(
      GAMIFICATION_DIMENSIONS.map((dimension) => dimension.key),
    );
    expect(documentedCards.map((card) => card.id)).toEqual(enabledCards.map((card) => card.id));

    for (const taskCard of enabledCards) {
      expect(documentedCards).toContainEqual(
        expect.objectContaining({
          id: taskCard.id,
          title: taskCard.title,
          description: taskCard.description,
        }),
      );
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
