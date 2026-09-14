import { httpClient } from './client.js';

export interface TwitchStatsResponse {
  isLive: boolean;
  stream?: {
    id?: string;
    user_name?: string;
    game_name?: string;
    title?: string;
    viewer_count?: number;
    started_at?: string;
    [key: string]: unknown;
  } | null;
  channel?: {
    display_name?: string;
    profile_image_url?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface TwitchAdScheduleData {
  hasAds: boolean;
  adSchedule?: {
    next_ad_at?: number;
    duration?: number;
    preroll_free_time?: number;
    snooze_count?: number;
    last_ad_at?: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface TwitchSessionItem {
  id: string;
  userId?: string;
  provider?: string;
  providerStreamId?: string;
  title: string;
  gameName?: string | null;
  peakViewers: number;
  startedAt: string;
  endedAt?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface StreamRetentionMetrics {
  averageViewers: number;
  peakViewers: number;
  watchTimeHours: number;
  retentionRate: number;
  isCaptive: boolean;
  durationMinutes: number;
  [key: string]: unknown;
}

export interface TwitchMetricsResponse {
  session?: TwitchSessionItem;
  metrics: Array<{
    id?: string;
    sessionId?: string;
    viewerCount: number;
    timestamp: string;
    [key: string]: unknown;
  }>;
  retention?: StreamRetentionMetrics | null;
  [key: string]: unknown;
}

export interface TwitchSummaryResponse {
  totalStreams: number;
  totalHoursLive: number;
  overallRetentionRate: number;
  captiveRetentionCount: number;
  averageWatchTimeHours: number;
  peakViewersMax: number;
  [key: string]: unknown;
}

export interface TimelinePoint {
  label: string;
  watchTime: number;
  avgViewers: number;
  streamsCount?: number;
  [key: string]: unknown;
}

export interface TopDayMetric {
  day: string;
  count: number;
  percentage: number;
}

export interface TwitchBreakdownResponse {
  totalWatchTimeHours: number;
  totalStreamHours: number;
  overallRetentionRate: number;
  overallAverageViewers: number;
  highestPeakViewers: number;
  totalStreams: number;
  streamsPerWeek: number;
  topDays: TopDayMetric[];
  evolutionTimeline: TimelinePoint[];
  [key: string]: unknown;
}

/**
 * Récupère l'URL d'autorisation Twitch
 */
export async function getTwitchAuthUrlApi(): Promise<string> {
  const res = await httpClient('/twitch/auth');
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible d\'obtenir le lien de connexion Twitch');
  return data.url || '';
}

/**
 * Récupère l'état du live / chaîne
 */
export async function getTwitchStatsApi(query: string = ''): Promise<TwitchStatsResponse> {
  const res = await httpClient(`/twitch/current${query}`);
  const data = (await res.json()) as TwitchStatsResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques Twitch');
  return data;
}

/**
 * Récupère l'historique des 20 derniers streams
 */
export async function getTwitchHistoryApi(): Promise<TwitchSessionItem[]> {
  const res = await httpClient('/twitch/history');
  const data = (await res.json()) as TwitchSessionItem[] & { error?: string };
  if (!res.ok) throw new Error((data as unknown as { error?: string }).error || 'Impossible de charger l\'historique');
  return data;
}

/**
 * Récupère les métriques détaillées d'une session pour le graphique
 */
export async function getTwitchMetricsApi(sessionId: string): Promise<TwitchMetricsResponse> {
  const res = await httpClient(`/twitch/history/${sessionId}`);
  const data = (await res.json()) as TwitchMetricsResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les métriques du stream');
  return data;
}

/**
 * Récupère le résumé global des KPIs de rétention (30 derniers jours)
 */
export async function getTwitchSummaryApi(): Promise<TwitchSummaryResponse> {
  const res = await httpClient('/twitch/analytics/summary');
  const data = (await res.json()) as TwitchSummaryResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible de charger le résumé analytics');
  return data;
}

/**
 * Récupère les métriques de fréquence et l'évolution temporelle (Hebdo, Mensuel, Annuel, Tout)
 */
export async function getTwitchBreakdownApi(period: string = 'all'): Promise<TwitchBreakdownResponse> {
  const res = await httpClient(`/twitch/analytics/breakdown?period=${period}`);
  const data = (await res.json()) as TwitchBreakdownResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible de charger les statistiques globales');
  return data;
}

/**
 * Récupère le radar publicitaire officiel (compte à rebours pub, pré-rolls)
 */
export async function getTwitchAdScheduleApi(query: string = ''): Promise<TwitchAdScheduleData> {
  const res = await httpClient(`/twitch/ads${query}`);
  const data = (await res.json()) as TwitchAdScheduleData & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Impossible de charger le radar publicitaire');
  return data;
}

