"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TEAM_DYNAMICS_REFRESH_EVENT,
  dispatchTeamDynamicsRefresh,
} from "@/lib/team-dynamics-refresh";
import type { TeamDynamicListResponse } from "@/lib/team-dynamics";
import { TeamDynamicsPanel } from "@/components/team-dynamics/TeamDynamicsPanel";

export function TeamDynamicsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TeamDynamicListResponse["items"]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPreview = useCallback(async () => {
    const response = await fetch("/api/team-dynamics?view=panel", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as TeamDynamicListResponse;
    setUnreadCount(body.unreadCount);
    setItems(body.items);
  }, []);

  useEffect(() => {
    void fetchPreview();

    const timer = window.setInterval(() => void fetchPreview(), 30000);
    const handleRefresh = () => void fetchPreview();
    window.addEventListener(TEAM_DYNAMICS_REFRESH_EVENT, handleRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(TEAM_DYNAMICS_REFRESH_EVENT, handleRefresh);
    };
  }, [fetchPreview]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`团队动态，未读 ${unreadCount} 条`}
        onClick={() => setOpen((value) => !value)}
        className="team-dynamics-bell-btn"
      >
        <span aria-hidden="true">铃</span>
        {unreadCount > 0 ? <span className="team-dynamics-bell-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <TeamDynamicsPanel
          items={items}
          unreadCount={unreadCount}
          onOpenItem={async (itemId) => {
            await fetch("/api/team-dynamics/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "single", id: itemId }),
            });
            dispatchTeamDynamicsRefresh();
            setOpen(false);
            router.push("/dynamics");
          }}
          onOpenAll={() => {
            setOpen(false);
            router.push("/dynamics");
          }}
        />
      ) : null}
    </div>
  );
}
