import { httpClient } from './client.js';

export async function getTwitchStatsApi() {
  const res = await httpClient('/twitch/stats');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques Twitch');
  return data;
}