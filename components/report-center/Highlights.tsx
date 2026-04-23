"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportHighlight } from "./report-data";

interface HighlightsProps {
  highlights: ReportHighlight[];
}

const toneClasses: Record<ReportHighlight["tone"], string> = {
  blue: "bg-sky-100 text-sky-950",
  green: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950",
};

const bodyClasses: Record<ReportHighlight["tone"], string> = {
  blue: "text-sky-800",
  green: "text-emerald-800",
  rose: "text-rose-800",
};

const iconByTone: Record<ReportHighlight["tone"], string> = {
  blue: SvgIcons.megaphone,
  green: SvgIcons.trophy,
  rose: SvgIcons.target,
};

export function Highlights({ highlights }: HighlightsProps) {
  return (
    <aside className="flex flex-col gap-4">
      {highlights.map((highlight) => (
        <article
          key={highlight.title}
          className={`report-highlight-card min-h-36 flex-1 p-5 ${toneClasses[highlight.tone]}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">{highlight.title}</h3>
            <div className="report-highlight-icon h-10 w-10" dangerouslySetInnerHTML={{ __html: iconByTone[highlight.tone] }} />
          </div>
          <p className={`text-sm font-bold leading-relaxed ${bodyClasses[highlight.tone]}`}>{highlight.body}</p>
        </article>
      ))}
    </aside>
  );
}
