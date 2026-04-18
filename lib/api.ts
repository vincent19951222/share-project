export async function fetchTeamData(): Promise<{ teamCoins: number; targetCoins: number }> {
  return { teamCoins: 1250, targetCoins: 2000 };
}

export async function submitPunch(
  _memberId: string,
  _type: string
): Promise<{ success: boolean; coinsEarned: number }> {
  return { success: true, coinsEarned: 15 };
}

export async function fetchLogs(): Promise<never[]> {
  return [];
}

export async function sendPoke(_memberId: string): Promise<void> {}
