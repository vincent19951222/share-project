import type { TeamDynamicListItem } from "@/lib/team-dynamics";
import { TeamDynamicCard } from "./TeamDynamicCard";

export function TeamDynamicsTimeline({
  items,
  mode,
  onOpenItem,
}: {
  items: TeamDynamicListItem[];
  mode: "panel" | "page";
  onOpenItem?: (itemId: string) => void | Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-sub">
        {mode === "panel" ? "最近还没有值得沉淀的团队动态" : "未读动态已经清空"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <TeamDynamicCard key={item.id} item={item} mode={mode} onOpen={onOpenItem} />
      ))}
    </div>
  );
}
