"use client";

import type { SupplyAiImageSnapshot } from "@/lib/types";

interface SupplyArtworkBackpackPanelProps {
  snapshot: SupplyAiImageSnapshot;
  onBackToStudio?: () => void;
}

function formatAssetCount(count: number, unit: string) {
  return `${count} ${unit}`;
}

export function SupplyArtworkBackpackPanel({ onBackToStudio, snapshot }: SupplyArtworkBackpackPanelProps) {
  const themeNameById = new Map(snapshot.themes.unlocked.map((theme) => [theme.id, theme.name]));

  return (
    <section
      className="supply-artwork-backpack-panel grid gap-4 xl:grid-cols-[minmax(240px,3fr)_minmax(0,7fr)]"
      data-panel="artworks"
    >
      <header className="soft-card flex flex-wrap items-start justify-between gap-4 p-4 xl:col-span-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">AI ASSET BACKPACK</p>
          <h2 className="mt-1 text-2xl font-black text-main">我的资产背包</h2>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border-2 border-slate-900 bg-yellow-100 px-3 py-1 text-xs font-black text-main shadow-[0_2px_0_0_#1f2937]">
            {formatAssetCount(snapshot.themes.unlocked.length, "个主题")}
          </span>
          <span className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-main shadow-[0_2px_0_0_#1f2937]">
            {formatAssetCount(snapshot.recentArtworks.length, "张作品")}
          </span>
          {onBackToStudio ? (
            <button
              className="rounded-full border-2 border-slate-900 bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-[0_2px_0_0_#94a3b8]"
              data-action="back-to-ai-image-studio"
              onClick={onBackToStudio}
              type="button"
            >
              继续创作
            </button>
          ) : null}
        </div>
      </header>

      <aside className="soft-card min-w-0 p-4" aria-label="主题资产">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">THEMES</p>
            <h3 className="mt-1 text-xl font-black text-main">主题卡</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-sub">
            {snapshot.themes.unlocked.length}
          </span>
        </div>

        <div className="mt-4 grid gap-2.5">
          {snapshot.themes.unlocked.map((theme) => (
            <article
              className="grid h-[96px] grid-cols-[88px_minmax(0,1fr)] overflow-hidden rounded-lg border-2 border-slate-900 bg-white shadow-[0_3px_0_0_#1f2937]"
              data-testid="supply-theme-asset"
              key={theme.id}
            >
              <img
                alt={`主题卡：${theme.name}`}
                className="h-full min-h-0 w-full object-cover"
                loading="lazy"
                src={theme.previewImageUrl}
              />
              <div className="min-w-0 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-black text-main">{theme.name}</p>
                  <span className="max-w-[72px] shrink-0 truncate rounded-full border-2 border-slate-900 bg-yellow-100 px-2 py-0.5 text-[10px] font-black text-main shadow-[0_1px_0_0_#1f2937]">
                    {theme.tag}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-sub">{theme.description}</p>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <section className="soft-card min-w-0 p-4" aria-label="作品资产">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">ARTWORKS</p>
            <h3 className="mt-1 text-xl font-black text-main">作品</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-sub">
            {snapshot.recentArtworks.length}
          </span>
        </div>

        {snapshot.recentArtworks.length > 0 ? (
          <div className="mt-4 columns-2 gap-3 lg:columns-3" data-testid="supply-artwork-grid">
            {snapshot.recentArtworks.map((artwork) => {
              const themeName = themeNameById.get(artwork.themeId) ?? "AI 作品";

              return (
                <figure
                  className="mb-3 break-inside-avoid overflow-hidden rounded-xl border-[3px] border-slate-900 bg-white shadow-[0_4px_0_0_#1f2937]"
                  data-testid="supply-artwork-asset"
                  key={artwork.id}
                >
                  <img alt={`作品：${themeName}`} className="w-full object-cover" src={artwork.imageUrl} />
                  <figcaption className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate text-xs font-black text-main">{themeName}</span>
                    <span className="shrink-0 text-[10px] font-black text-sub">
                      {new Date(artwork.createdAt).toLocaleDateString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-sub">
            还没有作品
          </div>
        )}
      </section>
    </section>
  );
}
