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

  it("keeps the supply secondary navigation hidden until the supply chrome is hovered or focused", () => {
    const navRuleStart = css.indexOf(".app-supply-secondary-nav {");
    expect(navRuleStart).toBeGreaterThanOrEqual(0);
    const navRule = css.slice(navRuleStart, css.indexOf("}", navRuleStart) + 1);

    expect(navRule).toMatch(/position:\s*absolute/);
    expect(navRule).toMatch(/top:\s*calc\(100% - 0\.2rem\)/);
    expect(navRule).toMatch(/left:\s*50%/);
    expect(navRule).toMatch(/right:\s*auto/);
    expect(navRule).toMatch(/width:\s*max-content/);
    expect(navRule).toMatch(/max-width:\s*calc\(100vw - 3rem\)/);
    expect(navRule).toMatch(/opacity:\s*0/);
    expect(navRule).toMatch(/pointer-events:\s*none/);
    expect(navRule).toMatch(/transform:\s*translate\(-50%,\s*-0\.45rem\)/);
    expect(navRule).toMatch(/visibility:\s*hidden/);
    expect(navRule).not.toMatch(/margin-top/);

    expect(css).toContain(".app-top-nav--with-supply-menu:has(.app-supply-primary-tab:hover) .app-supply-secondary-nav");
    expect(css).toContain(
      ".app-top-nav--with-supply-menu:has(.app-supply-primary-tab:focus-visible) .app-supply-secondary-nav",
    );
    expect(css).toContain(".app-top-nav--with-supply-menu:has(.app-supply-secondary-nav:hover) .app-supply-secondary-nav");
    expect(css).toContain(
      ".app-top-nav--with-supply-menu:has(.app-supply-secondary-nav:focus-within) .app-supply-secondary-nav",
    );
    expect(css).toContain(".app-top-nav--with-supply-menu.app-supply-menu-open .app-supply-secondary-nav");
    expect(css).toMatch(/transform:\s*translate\(-50%,\s*0\)/);
    expect(css).toMatch(/visibility:\s*visible/);
  });

  it("renders the hover-revealed secondary navigation on a content-width shelf", () => {
    const shelfRuleStart = css.indexOf(".app-supply-secondary-nav::before");
    expect(shelfRuleStart).toBeGreaterThanOrEqual(0);
    const shelfRule = css.slice(shelfRuleStart, css.indexOf("}", shelfRuleStart) + 1);

    expect(shelfRule).toMatch(/position:\s*absolute/);
    expect(shelfRule).toMatch(/inset:\s*0 0 0\.15rem/);
    expect(shelfRule).toMatch(/border:\s*3px solid #111827/);
    expect(shelfRule).toMatch(/background:\s*rgba\(255,\s*248,\s*232,\s*0\.96\)/);
    expect(shelfRule).toMatch(/box-shadow:\s*4px 4px 0 rgba\(17,\s*24,\s*39,\s*0\.38\)/);
  });

  it("renders generated image icons inside the secondary supply tabs", () => {
    const iconRuleStart = css.indexOf(".app-supply-secondary-tab img {");
    expect(iconRuleStart).toBeGreaterThanOrEqual(0);
    const iconRule = css.slice(iconRuleStart, css.indexOf("}", iconRuleStart) + 1);

    expect(iconRule).toMatch(/display:\s*block/);
    expect(iconRule).toMatch(/width:\s*1\.45rem/);
    expect(iconRule).toMatch(/height:\s*1\.45rem/);
    expect(iconRule).toMatch(/image-rendering:\s*pixelated/);
    expect(iconRule).toMatch(/object-fit:\s*contain/);
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
});
