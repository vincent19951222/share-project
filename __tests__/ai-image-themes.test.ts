// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toClientThemeSnapshot } from "@/lib/gamification/ai-image/theme-snapshot";
import { getAiImageThemeById, getAiImageThemes } from "@/lib/gamification/ai-image/themes";

describe("AI image preset themes", () => {
  it("loads 13 enabled presets with exactly one default unlock", () => {
    const themes = getAiImageThemes();

    expect(themes).toHaveLength(13);
    expect(themes.filter((theme) => theme.defaultUnlocked)).toHaveLength(1);
    expect(themes.every((theme) => theme.enabled)).toBe(true);
  });

  it("does not expose promptTemplate in client snapshots", () => {
    const theme = getAiImageThemeById("theme-01");
    expect(theme?.promptTemplate).toContain("pixel");

    const snapshot = toClientThemeSnapshot(theme!, true);

    expect(snapshot).toMatchObject({
      id: "theme-01",
      unlocked: true,
      defaultUnlocked: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
    expect(JSON.stringify(snapshot)).not.toContain(theme!.promptTemplate);
  });

  it("keeps prompt-bearing themes behind a server-only module and snapshots in a prompt-free module", () => {
    const themesSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/themes.ts"),
      "utf8",
    );
    const promptSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/prompt.ts"),
      "utf8",
    );
    const snapshotSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/theme-snapshot.ts"),
      "utf8",
    );

    expect(themesSource).toContain('import "server-only";');
    expect(promptSource).toContain('import "server-only";');
    expect(snapshotSource).not.toContain("promptTemplate");
    expect(snapshotSource).not.toContain("server-only");
    expect(snapshotSource).not.toContain('from "@/lib/gamification/ai-image/themes"');
  });

  it("returns cloned theme definitions so caller mutation cannot change preset state", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const originalPalette = [...theme.palette];

    theme.name = "changed";
    theme.palette.push("#000000");

    const freshTheme = getAiImageThemeById("theme-01")!;
    const freshThemes = getAiImageThemes();

    expect(freshTheme.name).toBe("牛马像素馆");
    expect(freshTheme.palette).toEqual(originalPalette);
    expect(freshThemes[0].name).toBe("牛马像素馆");
    expect(freshThemes[0].palette).toEqual(originalPalette);
  });

  it("returns cloned snapshot palettes so client mutation stays local", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = toClientThemeSnapshot(theme, true);

    snapshot.palette.push("#000000");

    const freshSnapshot = toClientThemeSnapshot(getAiImageThemeById("theme-01")!, true);

    expect(freshSnapshot.palette).toEqual(["#fde047", "#1f2937", "#f8fafc"]);
  });
});
