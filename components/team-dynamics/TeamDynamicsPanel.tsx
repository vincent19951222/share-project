import type { TeamDynamicListItem } from "@/lib/team-dynamics";
import { TeamDynamicsTimeline } from "./TeamDynamicsTimeline";

export function TeamDynamicsPanel({
  items,
  unreadCount,
  onOpenItem,
  onOpenAll,
}: {
  items: TeamDynamicListItem[];
  unreadCount: number;
  onOpenItem: (itemId: string) => void | Promise<void>;
  onOpenAll: () => void;
}) {
  return (
    <div className="team-dynamics-panel dropdown-menu show p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-main">团队动态</h2>
          <p className="text-xs font-bold text-sub">未读 {unreadCount} 条</p>
        </div>
        <button type="button" className="quest-btn px-3 py-1 text-xs" onClick={onOpenAll}>
          查看全部动态
        </button>
      </div>
      <TeamDynamicsTimeline items={items} mode="panel" onOpenItem={onOpenItem} />
    </div>
  );
}
