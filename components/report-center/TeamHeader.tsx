"use client";

import type { DashboardScope } from "@/lib/types";
import { formatScopeLabel } from "@/lib/dashboard-scope";
import { PeriodNavigator } from "@/components/dashboard/PeriodNavigator";

export function TeamHeader({
  scope,
  onScopeChange,
}: {
  scope: DashboardScope;
  onScopeChange: (s: DashboardScope) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-main">战报中心</h1>
        <p className="text-sub">{formatScopeLabel(scope)}战报</p>
      </div>
      <PeriodNavigator scope={scope} onScopeChange={onScopeChange} />
    </div>
  );
}
