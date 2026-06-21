"use client";

import type { DashboardScope } from "@/lib/types";
import { PeriodNavigator } from "./PeriodNavigator";

interface DashboardHeaderProps {
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
}

export function DashboardHeader({ scope, onScopeChange }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-title-group">
        <h1 className="dashboard-header-title">牛马日历</h1>
        <p className="dashboard-header-subtitle">个人看板</p>
      </div>
      <PeriodNavigator scope={scope} onScopeChange={onScopeChange} />
    </header>
  );
}
