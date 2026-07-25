import { retiredSupplyResponse } from "@/lib/gamification/retired-supply-response";

export async function GET(_request: Request) {
  return retiredSupplyResponse();
}
