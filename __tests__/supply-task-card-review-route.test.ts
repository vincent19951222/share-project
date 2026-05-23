import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task-card review route isolation", () => {
  it("adds an isolated review route without production wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/task-card-review/page.tsx")).toBe(true);

    const page = readFileSync("app/ui-lab/supply-dashboard/task-card-review/page.tsx", "utf8");
    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");

    expect(page).toContain("TaskCardReviewScene");
    expect(boardPage).not.toContain("TaskCardReviewScene");
    expect(navbar).not.toContain("task-card-review");
    expect(supplyStation).not.toContain("TaskCardReviewScene");
  });
});
