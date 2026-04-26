export const TEAM_DYNAMICS_REFRESH_EVENT = "team-dynamics:refresh";

export function dispatchTeamDynamicsRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TEAM_DYNAMICS_REFRESH_EVENT));
}
