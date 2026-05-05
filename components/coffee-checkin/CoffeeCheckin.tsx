"use client";

import type { ReactNode } from "react";
import { useCoffee } from "@/lib/coffee-store";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

const coffeeSceneProps = [
  { src: "/assets/home-scenes/coffee/takeaway-cup.webp", alt: "", className: "coffee-scene-prop coffee-scene-cup" },
  { src: "/assets/home-scenes/coffee/note-no-coffee-no-gain.webp", alt: "", className: "coffee-scene-prop coffee-scene-note-left" },
  { src: "/assets/home-scenes/coffee/note-but-first-coffee.webp", alt: "", className: "coffee-scene-prop coffee-scene-note-right" },
  { src: "/assets/home-scenes/coffee/sugar-packet.webp", alt: "", className: "coffee-scene-prop coffee-scene-sugar" },
  { src: "/assets/home-scenes/coffee/coffee-beans.webp", alt: "", className: "coffee-scene-prop coffee-scene-beans-left" },
  { src: "/assets/home-scenes/coffee/coffee-beans.webp", alt: "", className: "coffee-scene-prop coffee-scene-beans-right" },
  { src: "/assets/home-scenes/coffee/coffee-ring-stain.webp", alt: "", className: "coffee-scene-prop coffee-scene-ring" },
  { src: "/assets/home-scenes/coffee/coffee-stamp-paper.webp", alt: "", className: "coffee-scene-prop coffee-scene-stamp" },
  { src: "/assets/home-scenes/coffee/receipt-clip.webp", alt: "", className: "coffee-scene-prop coffee-scene-clip" },
] as const;

function CoffeeSceneFrame({ children }: { children: ReactNode }) {
  return (
    <section className="coffee-scene">
      <div className="coffee-scene-background" aria-hidden="true" />
      <div className="coffee-scene-props" aria-hidden="true">
        {coffeeSceneProps.map((prop) => (
          <img key={prop.className} src={prop.src} alt={prop.alt} className={prop.className} />
        ))}
      </div>
      <div className="coffee-scene-content">{children}</div>
    </section>
  );
}

export function CoffeeCheckin() {
  const { snapshot, busy, error, addCup, removeCup } = useCoffee();

  if (!snapshot) {
    if (error) {
      return (
        <CoffeeSceneFrame>
          <section className="coffee-scene-state" aria-live="polite">
            <div className="max-w-md">
              <h2 className="text-3xl font-black leading-tight">咖啡小票没打出来</h2>
              <p className="mt-3 text-sm font-bold text-orange-800">{error}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a href="/login" className="coffee-scene-state-action coffee-scene-state-action-primary">
                  重新登录
                </a>
                <button type="button" onClick={() => window.location.reload()} className="coffee-scene-state-action">
                  刷新重试
                </button>
              </div>
            </div>
          </section>
        </CoffeeSceneFrame>
      );
    }

    return (
      <CoffeeSceneFrame>
        <section className="coffee-scene-state" aria-live="polite">
          正在打印今日咖啡小票...
        </section>
      </CoffeeSceneFrame>
    );
  }

  return (
    <CoffeeSceneFrame>
      <section className="coffee-counter-layout">
        <CoffeeReceipt
          snapshot={snapshot}
          busy={busy}
          error={error}
          onAddCup={() => void addCup()}
          onRemoveCup={() => void removeCup()}
        />
        <CoffeeGrid
          snapshot={snapshot}
          busy={busy}
          onAddCup={() => void addCup()}
          onRemoveCup={() => void removeCup()}
        />
      </section>
    </CoffeeSceneFrame>
  );
}
