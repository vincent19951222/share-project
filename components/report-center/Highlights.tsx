"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportHighlight } from "./report-data";

interface HighlightsProps {
  highlights: ReportHighlight[];
}

const toneClasses: Record<ReportHighlight["tone"], string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-900",
  green: "bg-green-50 border-green-100 text-green-900",
  rose: "bg-rose-50 border-rose-100 text-rose-900",
};

const bodyClasses: Record<ReportHighlight["tone"], string> = {
  blue: "text-blue-700",
  green: "text-green-700",
  rose: "text-rose-700",
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
          className={`min-h-32 flex-1 rounded-[1.25rem] border-4 p-5 ${toneClasses[highlight.tone]}`}
        >
          <div className="mb-3 h-9 w-9" dangerouslySetInnerHTML={{ __html: iconByTone[highlight.tone] }} />
          <h3 className="text-lg font-black">{highlight.title}</h3>
          <p className={`mt-2 text-sm font-bold leading-relaxed ${bodyClasses[highlight.tone]}`}>{highlight.body}</p>
        </article>
      ))}
    </aside>
  );
}
