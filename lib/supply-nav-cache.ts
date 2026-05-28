import { fetchSupplyStationState } from "@/lib/api";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import { buildSupplyNavContext } from "@/lib/supply-nav-context";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

let cachedSupplyNavContext: SupplyNavContext | null = null;
let cachedSupplyNavContextUserId: string | null = null;
let pendingSupplyNavContext: Promise<SupplyNavContext> | null = null;
let pendingSupplyNavContextUserId: string | null = null;

export function getCachedSupplyNavContext(userId?: string | null): SupplyNavContext | null {
  if (userId && cachedSupplyNavContextUserId !== userId) {
    return null;
  }

  return cachedSupplyNavContext;
}

export function cacheSupplyNavContext(
  context: SupplyNavContext | null,
  userId?: string | null,
): SupplyNavContext | null {
  cachedSupplyNavContext = context;
  cachedSupplyNavContextUserId = context ? (userId ?? null) : null;
  return cachedSupplyNavContext;
}

export function cacheSupplyNavSnapshot(
  snapshot: SupplyStationProductionSnapshot,
  userId?: string | null,
): SupplyNavContext {
  return cacheSupplyNavContext(buildSupplyNavContext(snapshot), userId)!;
}

export async function ensureSupplyNavContext(userId?: string | null): Promise<SupplyNavContext> {
  const cachedContext = getCachedSupplyNavContext(userId);
  if (cachedContext) {
    return cachedContext;
  }

  if (!pendingSupplyNavContext || pendingSupplyNavContextUserId !== (userId ?? null)) {
    pendingSupplyNavContextUserId = userId ?? null;
    pendingSupplyNavContext = fetchSupplyStationState()
      .then((snapshot) => cacheSupplyNavSnapshot(snapshot, userId))
      .finally(() => {
        pendingSupplyNavContext = null;
        pendingSupplyNavContextUserId = null;
      });
  }

  return pendingSupplyNavContext;
}

export function resetSupplyNavContextCacheForTests() {
  cachedSupplyNavContext = null;
  cachedSupplyNavContextUserId = null;
  pendingSupplyNavContext = null;
  pendingSupplyNavContextUserId = null;
}
