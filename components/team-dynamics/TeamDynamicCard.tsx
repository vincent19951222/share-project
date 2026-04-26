import { getTeamDynamicMeta, type TeamDynamicListItem } from "@/lib/team-dynamics";

function formatOccurredAt(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TeamDynamicCard({
  item,
  onOpen,
}: {
  item: TeamDynamicListItem;
  onOpen?: (id: string) => void | Promise<void>;
}) {
  const meta = getTeamDynamicMeta(item.type);

  return (
    <button
      type="button"
      className={`team-dynamic-card text-left ${
        item.isRead ? "team-dynamic-card-read" : "team-dynamic-card-unread"
      }`}
      onClick={() => void onOpen?.(item.id)}
      disabled={!onOpen}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`team-dynamic-pill team-dynamic-pill-${meta.tone}`}>{meta.label}</span>
        <span className="text-[11px] font-bold text-sub">{formatOccurredAt(item.occurredAt)}</span>
      </div>
      <h3 className="mt-2 text-sm font-black text-main">{item.title}</h3>
      <p className="mt-1 text-sm font-bold text-slate-600">{item.summary}</p>
    </button>
  );
}
