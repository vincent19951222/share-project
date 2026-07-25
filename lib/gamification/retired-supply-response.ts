import { NextResponse } from "next/server";

export function retiredSupplyResponse() {
  return NextResponse.json(
    {
      error: "牛马补给站已下线",
      code: "SUPPLY_FEATURE_RETIRED",
    },
    { status: 410 },
  );
}
