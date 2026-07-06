"use client";

import type { SupplyAiImageSnapshot } from "@/lib/types";

interface SupplyArtworkBackpackPanelProps {
  snapshot: SupplyAiImageSnapshot;
}

export function SupplyArtworkBackpackPanel({ snapshot }: SupplyArtworkBackpackPanelProps) {
  return (
    <section className="supply-artwork-backpack-panel grid gap-4 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
      <aside className="soft-card p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">UNLOCKED THEMES</p>
        <h2 className="mt-1 text-2xl font-black text-main">主题背包</h2>
        <div className="mt-4 flex flex-col gap-3">
          {snapshot.themes.unlocked.map((theme) => (
            <div
              key={theme.id}
              className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[0_4px_0_0_#1f2937]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-main">{theme.name}</p>
                  <p className="mt-1 text-sm font-bold text-sub">{theme.description}</p>
                </div>
                <span className="rounded-full border-2 border-slate-900 bg-yellow-100 px-2 py-1 text-[10px] font-black text-main shadow-[0_2px_0_0_#1f2937]">
                  {theme.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="soft-card p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">ARTWORKS</p>
        <h3 className="mt-1 text-2xl font-black text-main">作品库</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshot.recentArtworks.map((artwork) => (
            <figure
              key={artwork.id}
              className="overflow-hidden rounded-xl border-[3px] border-slate-900 bg-white shadow-[0_4px_0_0_#1f2937]"
            >
              <img alt="AI 作品" className="aspect-square w-full object-cover" src={artwork.imageUrl} />
            </figure>
          ))}
          {snapshot.recentArtworks.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-sub">
              还没有可展示作品
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
