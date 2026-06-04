"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  addDrinkRecord,
  ApiError,
  fetchDrinkState,
  removeLatestDrinkRecord,
} from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import type { DrinkType } from "@/lib/drinks";
import type { DrinkSnapshot } from "@/lib/types";

interface DrinkContextType {
  snapshot: DrinkSnapshot | null;
  busy: boolean;
  error: string | null;
  confirmDrink: (input: { drinkType: DrinkType; note?: string | null }) => Promise<boolean>;
  removeLatestDrink: (drinkType?: DrinkType) => Promise<void>;
  refresh: () => Promise<void>;
}

const DrinkContext = createContext<DrinkContextType | null>(null);
const DRINK_BACKED_PATHS = new Set(["/drink", "/report"]);

function shouldSyncDrinkState() {
  if (typeof window === "undefined") {
    return true;
  }

  return DRINK_BACKED_PATHS.has(window.location.pathname);
}

function getDrinkErrorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.status === 401) {
    return "登录状态过期，请重新登录。";
  }

  return caught instanceof Error ? caught.message : "水铺小票同步失败，稍后再试。";
}

export function DrinkProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DrinkSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!shouldSyncDrinkState()) {
      return;
    }

    try {
      const next = await fetchDrinkState();
      setSnapshot(next);
      setError(null);
    } catch (caught) {
      setError(getDrinkErrorMessage(caught));
    }
  }

  async function runMutation(action: () => Promise<DrinkSnapshot>) {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await action());
      dispatchCalendarRefresh();
      window.dispatchEvent(new Event("activity-events:refresh"));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function sync() {
      if (!shouldSyncDrinkState()) {
        return;
      }

      try {
        const next = await fetchDrinkState();
        if (!cancelled) {
          setSnapshot(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(getDrinkErrorMessage(caught));

          if (caught instanceof ApiError && caught.status === 401 && timer) {
            window.clearInterval(timer);
          }
        }
      }
    }

    void sync();
    timer = window.setInterval(sync, 5000);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <DrinkContext.Provider
      value={{
        snapshot,
        busy,
        error,
        confirmDrink: (input) => runMutation(() => addDrinkRecord(input)),
        removeLatestDrink: async (drinkType) => {
          await runMutation(() => removeLatestDrinkRecord(drinkType));
        },
        refresh,
      }}
    >
      {children}
    </DrinkContext.Provider>
  );
}

export function useDrink() {
  const context = useContext(DrinkContext);

  if (!context) {
    throw new Error("useDrink must be used within DrinkProvider");
  }

  return context;
}
