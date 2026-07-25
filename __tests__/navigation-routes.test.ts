import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { aiImagePanelRoutes, appTabRoutes } from "@/lib/navigation-routes";

describe("formal navigation routes", () => {
  it("keeps exactly four primary dashboard routes", () => {
    expect(appTabRoutes).toEqual({
      punch: "/",
      board: "/board",
      coffee: "/drink",
      data: "/calendar",
    });
  });

  it("owns AI image navigation independently from the retired supply station", () => {
    expect(aiImagePanelRoutes).toEqual({
      studio: "/ai-image",
      themes: "/ai-image?view=themes",
      artworks: "/ai-image?view=artworks",
    });
  });

  it("redirects old supply pages to AI image views or home", () => {
    const redirects = {
      "app/(board)/dashboard/status/page.tsx": "/ai-image",
      "app/(board)/dashboard/cards/page.tsx": "/ai-image?view=themes",
      "app/(board)/dashboard/backpack/page.tsx": "/ai-image?view=artworks",
      "app/(board)/dashboard/quest/page.tsx": "/",
      "app/(board)/dashboard/store/page.tsx": "/",
      "app/ui-lab/supply-dashboard/page.tsx": "/ai-image",
      "app/ui-lab/supply-dashboard/draw-pool/page.tsx": "/ai-image?view=themes",
      "app/ui-lab/supply-dashboard/backpack/page.tsx": "/ai-image?view=artworks",
      "app/ui-lab/supply-dashboard/task-record/page.tsx": "/",
      "app/ui-lab/supply-dashboard/shop/page.tsx": "/",
    };

    for (const [path, target] of Object.entries(redirects)) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("redirect(");
      expect(source).toContain(JSON.stringify(target));
      expect(source).not.toContain("BoardApp");
    }
  });

  it("keeps AI image in the profile menu instead of primary navigation", () => {
    const profile = readFileSync("components/navbar/ProfileDropdown.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");

    expect(profile).toContain("AI 生图实验室");
    expect(profile).toContain("aiImagePanelRoutes.studio");
    expect(navbar).not.toContain("牛马补给站");
  });
});
