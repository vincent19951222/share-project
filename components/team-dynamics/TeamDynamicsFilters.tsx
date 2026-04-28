import {
  TEAM_DYNAMIC_TYPES,
  type TeamDynamicFilterType,
} from "@/lib/team-dynamics";

const FILTER_OPTIONS: Array<{ value: TeamDynamicFilterType; label: string }> = [
  { value: "ALL", label: "全部类型" },
  { value: TEAM_DYNAMIC_TYPES.SEASON_STARTED, label: "赛季" },
  { value: TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED, label: "里程碑" },
  { value: TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED, label: "周报" },
  { value: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE, label: "连签" },
];

export function TeamDynamicsFilters({
  unreadOnly,
  activeType,
  onToggleUnread,
  onTypeChange,
}: {
  unreadOnly: boolean;
  activeType: TeamDynamicFilterType;
  onToggleUnread: () => void | Promise<void>;
  onTypeChange: (value: TeamDynamicFilterType) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="quest-btn px-3 py-1 text-xs" onClick={() => void onToggleUnread()}>
        {unreadOnly ? "查看全部" : "只看未读"}
      </button>
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`team-dynamic-filter ${
            activeType === option.value ? "team-dynamic-filter-active" : ""
          }`}
          onClick={() => void onTypeChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
