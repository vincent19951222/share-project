"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TEAM_DYNAMICS_REFRESH_EVENT,
  dispatchTeamDynamicsRefresh,
} from "@/lib/team-dynamics-refresh";
import type { TeamDynamicListResponse } from "@/lib/team-dynamics";
import { TeamDynamicsPanel } from "@/components/team-dynamics/TeamDynamicsPanel";
import { SvgIcons } from "@/components/ui/SvgIcons";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function TeamDynamicsBell() {
  const router = useSafeRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TeamDynamicListResponse["items"]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPreview = useCallback(async () => {
    if (typeof fetch !== "function") {
      return;
    }

    try {
      const requestUrl =
        "mock" in fetch
          ? "/api/team-dynamics?view=panel"
          : (() => {
              if (typeof window === "undefined") {
                return null;
              }

              try {
                return new URL("/api/team-dynamics?view=panel", window.location.href).toString();
              } catch {
                return null;
              }
            })();

      if (!requestUrl) {
        return;
      }

      const response = await fetch(requestUrl, { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as TeamDynamicListResponse;
      setUnreadCount(body.unreadCount);
      setItems(body.items);
    } catch {
      // Ignore transient preview fetch failures so navbar-only renders stay stable.
    }
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

  const navigateToDynamics = useCallback(() => {
    if (router) {
      router.push("/dynamics");
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign("/dynamics");
    }
  }, [router]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`团队动态，未读 ${unreadCount} 条`}
        onClick={() => setOpen((value) => !value)}
        className="team-dynamics-bell-btn"
      >
        <span
          aria-hidden="true"
          className="team-dynamics-bell-icon"
          dangerouslySetInnerHTML={{ __html: SvgIcons.bell }}
        />
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
            navigateToDynamics();
          }}
          onOpenAll={() => {
            setOpen(false);
            navigateToDynamics();
          }}
        />
      ) : null}
    </div>
  );
}
