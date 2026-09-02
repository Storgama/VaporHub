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
  const res = await httpClient('/twitch/current');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques Twitch');
  return data;
}

/**
 * Récupère l'historique des 20 derniers streams
 */
export async function getTwitchHistoryApi() {
  const res = await httpClient('/twitch/history');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger l\'historique');
  return data;
}

/**
 * Récupère les métriques détaillées d'une session pour le graphique
 */
export async function getTwitchMetricsApi(sessionId) {
  const res = await httpClient(`/twitch/history/${sessionId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les métriques du stream');
  return data;
}

/**
 * Récupère le résumé global des KPIs de rétention (30 derniers jours)
 */
export async function getTwitchSummaryApi() {
  const res = await httpClient('/twitch/analytics/summary');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger le résumé analytics');
  return data;
}

/**
 * Récupère les métriques de fréquence et l'évolution temporelle (Hebdo, Mensuel, Annuel, Tout)
 */
export async function getTwitchBreakdownApi(period = 'all') {
  const res = await httpClient(`/twitch/analytics/breakdown?period=${period}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques globales');
  return data;
}