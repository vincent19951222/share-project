import { describe, expect, it } from "vitest";
import {
  TEAM_DYNAMICS_PAGE_LIMIT,
  TEAM_DYNAMICS_PANEL_LIMIT,
  TEAM_DYNAMIC_TYPES,
  getTeamDynamicMeta,
  normalizeTeamDynamicsQuery,
} from "@/lib/team-dynamics";

describe("team-dynamics helpers", () => {
  it("uses panel defaults when query params are absent", () => {
    const query = normalizeTeamDynamicsQuery(new URLSearchParams());

    expect(query.view).toBe("panel");
    expect(query.unreadOnly).toBe(false);
    expect(query.type).toBe("ALL");
    expect(query.limit).toBe(TEAM_DYNAMICS_PANEL_LIMIT);
  });

  it("accepts page view, unread filter, and explicit event type", () => {
    const query = normalizeTeamDynamicsQuery(
      new URLSearchParams("view=page&filter=unread&type=SEASON_STARTED"),
    );

    expect(query.view).toBe("page");
    expect(query.unreadOnly).toBe(true);
    expect(query.type).toBe(TEAM_DYNAMIC_TYPES.SEASON_STARTED);
    expect(query.limit).toBe(TEAM_DYNAMICS_PAGE_LIMIT);
  });

  it("ignores removed weekly report filters", () => {
    const query = normalizeTeamDynamicsQuery(
      new URLSearchParams("view=page&type=WEEKLY_REPORT_CREATED"),
    );

    expect(query.type).toBe("ALL");
  });

  it("returns readable meta for active dynamic cards", () => {
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED)).toMatchObject({
      label: "赛季里程碑",
      tone: "success",
    });
  });
});
