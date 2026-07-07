import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply embedded scene CSS", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("keeps production supply scenes inside the shared app shell instead of fixed to the viewport", () => {
    const embeddedRuleStart = css.indexOf(".supply-dashboard-scene--embedded,");
    expect(embeddedRuleStart).toBeGreaterThanOrEqual(0);
    const embeddedRule = css.slice(embeddedRuleStart, css.indexOf("}", embeddedRuleStart) + 1);

    expect(embeddedRule).toContain(".supply-shop-scene--embedded");
    expect(embeddedRule).toContain(".supply-task-record-scene--embedded");
    expect(embeddedRule).toContain(".supply-backpack-scene--embedded");
    expect(embeddedRule).toContain(".supply-draw-pool-scene--embedded");
    expect(embeddedRule).toMatch(/position:\s*relative/);
    expect(embeddedRule).toMatch(/inset:\s*auto/);
    expect(embeddedRule).toMatch(/width:\s*100%/);
    expect(embeddedRule).toMatch(/height:\s*100%/);
    expect(embeddedRule).not.toMatch(/position:\s*fixed/);
    expect(embeddedRule).not.toMatch(/width:\s*100vw/);
  });

  it("does not keep the removed shared Navbar supply secondary navigation styles", () => {
    expect(css).not.toContain(".app-supply-secondary-nav");
    expect(css).not.toContain(".app-supply-secondary-tab");
    expect(css).not.toContain(".app-supply-secondary-rail");
    expect(css).not.toContain(".app-top-nav--with-supply-menu");
  });

  it("keeps embedded supply content tight below the shared chrome", () => {
    const contentRuleStart = css.indexOf(".supply-dashboard-scene--embedded .supply-dashboard-content,");
    expect(contentRuleStart).toBeGreaterThanOrEqual(0);
    const contentRule = css.slice(contentRuleStart, css.indexOf("}", contentRuleStart) + 1);

    expect(contentRule).toMatch(/padding-top:\s*clamp\(0\.2rem,\s*0\.5vw,\s*0\.45rem\)/);
  });

  it("lets the embedded draw-pool layout use the main content row instead of the removed standalone topbar row", () => {
    const contentRuleStart = css.lastIndexOf(".supply-draw-pool-scene--embedded .supply-draw-pool-content {");
    expect(contentRuleStart).toBeGreaterThanOrEqual(0);
    const contentRule = css.slice(contentRuleStart, css.indexOf("}", contentRuleStart) + 1);

    expect(contentRule).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)/);
    expect(contentRule).toMatch(/height:\s*100%/);

    const layoutRuleStart = css.lastIndexOf(".supply-draw-pool-scene--embedded .supply-draw-pool-layout {");
    expect(layoutRuleStart).toBeGreaterThanOrEqual(0);
    const layoutRule = css.slice(layoutRuleStart, css.indexOf("}", layoutRuleStart) + 1);

    expect(layoutRule).toMatch(/height:\s*100%/);
  });

  it("keeps the supply primary navbar rhythm stable while compacting the asset slot", () => {
    const brandRuleStart = css.indexOf(".app-top-nav .font-black.text-2xl {");
    expect(brandRuleStart).toBeGreaterThanOrEqual(0);
    const brandRule = css.slice(brandRuleStart, css.indexOf("}", brandRuleStart) + 1);

    expect(brandRule).toMatch(/flex:\s*0 0 auto/);
    expect(brandRule).toMatch(/white-space:\s*nowrap/);

    const tabStripRuleStart = css.indexOf(".home-tab-strip {");
    expect(tabStripRuleStart).toBeGreaterThanOrEqual(0);
    const tabStripRule = css.slice(tabStripRuleStart, css.indexOf("}", tabStripRuleStart) + 1);

    expect(tabStripRule).toMatch(/flex:\s*0 0 auto/);

    const assetLabelRuleStart = css.indexOf(".app-supply-asset-chip span {");
    expect(assetLabelRuleStart).toBeGreaterThanOrEqual(0);
    const assetLabelRule = css.slice(assetLabelRuleStart, css.indexOf("}", assetLabelRuleStart) + 1);

    expect(assetLabelRule).toMatch(/display:\s*none/);
  });

  it("compacts supply resource chips inside the shared mobile navbar", () => {
    const mobileBlockStart = css.lastIndexOf("@media (max-width: 640px)");
    expect(mobileBlockStart).toBeGreaterThanOrEqual(0);
    const mobileBlock = css.slice(mobileBlockStart, css.indexOf("@media", mobileBlockStart + 1));

    expect(mobileBlock).toMatch(/\.app-supply-assets\s*\{[\s\S]*min-width:\s*0/);
    expect(mobileBlock).toMatch(/\.app-supply-assets\s*\{[\s\S]*flex:\s*0 1 auto/);
    expect(mobileBlock).toMatch(/\.app-supply-asset-chip\s*\{[\s\S]*min-height:\s*2\.05rem/);
    expect(mobileBlock).toMatch(/\.app-supply-asset-chip img\s*\{[\s\S]*width:\s*1\.2rem/);
    expect(mobileBlock).toMatch(/\.app-supply-asset-chip strong\s*\{[\s\S]*font-size:\s*0\.72rem/);
    expect(mobileBlock).toMatch(/\.app-supply-asset-chip--backpack strong\s*\{[\s\S]*font-size:\s*0\.68rem/);
  });

  it("moves the mobile supply wallet into a full-width navbar row", () => {
    const mobileBlockStart = css.lastIndexOf("@media (max-width: 760px)");
    expect(mobileBlockStart).toBeGreaterThanOrEqual(0);
    const mobileBlock = css.slice(mobileBlockStart, css.indexOf("@media", mobileBlockStart + 1));

    expect(mobileBlock).toMatch(/\.app-top-nav > div:first-child\s*\{[\s\S]*display:\s*grid/);
    expect(mobileBlock).toMatch(/grid-template-areas:\s*"brand actions"\s*"wallet wallet"/);
    expect(mobileBlock).toMatch(/\.app-supply-mobile-wallet\s*\{[\s\S]*grid-area:\s*wallet/);
    expect(mobileBlock).toMatch(/\.app-supply-mobile-wallet\s*\{[\s\S]*width:\s*100%/);
    expect(mobileBlock).toMatch(/\.app-supply-mobile-wallet\s*\{[\s\S]*max-width:\s*none/);
    expect(mobileBlock).not.toMatch(/\.app-supply-mobile-wallet span\s*\{[\s\S]*text-overflow:\s*ellipsis/);
  });

  it("centers the mobile nav toggle icon with drawn bars instead of text glyphs", () => {
    expect(css).toMatch(/\.mobile-nav-toggle\s*\{[\s\S]*display:\s*inline-grid/);
    expect(css).toMatch(/\.mobile-nav-toggle\s*\{[\s\S]*place-items:\s*center/);
    expect(css).toMatch(/\.mobile-nav-toggle\s*\{[\s\S]*line-height:\s*0/);
    expect(css).toMatch(/\.mobile-nav-toggle-icon\s*\{[\s\S]*position:\s*absolute/);
    expect(css).toMatch(/\.mobile-nav-toggle-icon\s*\{[\s\S]*left:\s*50%/);
    expect(css).toMatch(/\.mobile-nav-toggle-icon\s*\{[\s\S]*top:\s*50%/);
    expect(css).toMatch(/\.mobile-nav-toggle-icon\s*\{[\s\S]*transform:\s*translate\(-50%,\s*-50%\)/);
    expect(css).toMatch(/\.mobile-nav-toggle-icon::before,\s*\.mobile-nav-toggle-icon::after,\s*\.mobile-nav-toggle-icon span\s*\{[\s\S]*top:\s*50%/);
    expect(css).toMatch(/\.mobile-nav-toggle\[data-state="open"\]\s+\.mobile-nav-toggle-icon::before\s*\{[\s\S]*rotate\(45deg\)/);
    expect(css).toMatch(/\.mobile-nav-toggle\[data-state="open"\]\s+\.mobile-nav-toggle-icon::after\s*\{[\s\S]*rotate\(-45deg\)/);
  });
});
