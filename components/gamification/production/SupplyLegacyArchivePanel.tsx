"use client";

import type { SupplyLegacyArchiveSnapshot } from "@/lib/types";

interface SupplyLegacyArchivePanelProps {
  snapshot: SupplyLegacyArchiveSnapshot;
}

const ARCHIVE_ITEMS = [
  { key: "ticketBalance", label: "旧抽奖券" },
  { key: "inventoryQuantity", label: "旧背包库存" },
  { key: "redemptionCount", label: "旧兑换记录" },
  { key: "latestTaskRecordCount", label: "旧任务记录" },
] as const;

export function SupplyLegacyArchivePanel({ snapshot }: SupplyLegacyArchivePanelProps) {
  return (
    <section className="supply-legacy-archive-panel soft-card p-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">LEGACY ARCHIVE</p>
        <h2 className="mt-1 text-2xl font-black text-main">旧补给归档</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ARCHIVE_ITEMS.map((item) => (
          <article
            key={item.key}
            className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[0_4px_0_0_#1f2937]"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-main">{snapshot[item.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
