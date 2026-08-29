import { httpClient } from './client.js';

/**
 * Récupère l'URL d'autorisation Twitch
 */
export async function getTwitchAuthUrlApi() {
  const res = await httpClient('/twitch/auth');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible d\'obtenir le lien de connexion Twitch');
  return data.url;
}

/**
 * Récupère l'état du live / chaîne
 */
export async function getTwitchStatsApi() {
  const res = await httpClient('/twitch/live');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques Twitch');
  return data;
}