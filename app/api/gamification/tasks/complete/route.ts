import { retiredSupplyResponse } from "@/lib/gamification/retired-supply-response";

export async function POST(_request: Request) {
  return retiredSupplyResponse();
}
