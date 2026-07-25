// @vitest-environment node

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as legacyState } from "@/app/api/gamification/state/route";
import { GET as supplyState } from "@/app/api/gamification/supply/state/route";
import { POST as ensureTasks } from "@/app/api/gamification/tasks/ensure-today/route";
import { POST as completeTask } from "@/app/api/gamification/tasks/complete/route";
import { POST as rerollTask } from "@/app/api/gamification/tasks/reroll/route";
import { POST as claimTicket } from "@/app/api/gamification/tasks/claim-ticket/route";
import { POST as drawLottery } from "@/app/api/gamification/lottery/draw/route";
import { POST as purchaseItem } from "@/app/api/gamification/shop/purchase/route";
import { POST as useItem } from "@/app/api/gamification/items/use/route";
import { POST as requestRedemption } from "@/app/api/gamification/redemptions/request/route";
import { POST as confirmRedemption } from "@/app/api/admin/gamification/redemptions/confirm/route";
import { POST as cancelRedemption } from "@/app/api/admin/gamification/redemptions/cancel/route";
import { POST as respondSocial } from "@/app/api/gamification/social/respond/route";
import { POST as dismissSocial } from "@/app/api/gamification/social/dismiss/route";

const retiredHandlers = [
  legacyState,
  supplyState,
  ensureTasks,
  completeTask,
  rerollTask,
  claimTicket,
  drawLottery,
  purchaseItem,
  useItem,
  requestRedemption,
  confirmRedemption,
  cancelRedemption,
  respondSocial,
  dismissSocial,
];

describe("retired supply APIs", () => {
  it("returns a stable 410 response without executing legacy business writes", async () => {
    for (const handler of retiredHandlers) {
      const response = await handler(new NextRequest("http://localhost/api/retired"));

      expect(response.status).toBe(410);
      await expect(response.json()).resolves.toEqual({
        error: "牛马补给站已下线",
        code: "SUPPLY_FEATURE_RETIRED",
      });
    }
  });
});
