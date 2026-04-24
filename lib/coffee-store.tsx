"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  addTodayCoffeeCup,
  ApiError,
  fetchCoffeeState,
  removeLatestTodayCoffeeCup,
} from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import type { CoffeeSnapshot } from "@/lib/types";

interface CoffeeContextType {
  snapshot: CoffeeSnapshot | null;
  busy: boolean;
  error: string | null;
  addCup: () => Promise<void>;
  removeCup: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CoffeeContext = createContext<CoffeeContextType | null>(null);

function getCoffeeErrorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.status === 401) {
    return "登录状态过期，请重新登录。";
  }

  return caught instanceof Error
    ? caught.message
    : "咖啡小票同步失败，稍后再试。";
}

export function CoffeeProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<CoffeeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const next = await fetchCoffeeState();
      setSnapshot(next);
      setError(null);
    } catch (caught) {
      setError(getCoffeeErrorMessage(caught));
    }
  }

  async function runMutation(action: () => Promise<CoffeeSnapshot>) {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await action());
      dispatchCalendarRefresh();
      window.dispatchEvent(new Event("activity-events:refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function sync() {
      try {
        const next = await fetchCoffeeState();
        if (!cancelled) {
          setSnapshot(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(getCoffeeErrorMessage(caught));

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
    <CoffeeContext.Provider
      value={{
        snapshot,
        busy,
        error,
        addCup: () => runMutation(addTodayCoffeeCup),
        removeCup: () => runMutation(removeLatestTodayCoffeeCup),
        refresh,
      }}
    >
      {children}
    </CoffeeContext.Provider>
  );
}

export function useCoffee() {
  const context = useContext(CoffeeContext);

  if (!context) {
    throw new Error("useCoffee must be used within CoffeeProvider");
  }

  return context;
}
