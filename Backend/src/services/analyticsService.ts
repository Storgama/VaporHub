export interface RetentionTier {
    label: string;
    badge: 'captive' | 'stable' | 'volatile';
    color: string;
}

export interface RetentionMetrics {
    durationHours: number;
    averageViewers: number;
    peakViewers: number;
    retentionRate: number;
    retentionTier: RetentionTier;
    watchTimeHours: number;
}

export interface SessionInput {
    id?: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    peakViewers?: number | null;
    title?: string | null;
    gameName?: string | null;
    [key: string]: unknown;
}

export interface MetricPointInput {
    timestamp?: Date | string | null;
    viewerCount?: number | null;
    [key: string]: unknown;
}

export interface CalculatedStreamInput {
    id?: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    durationHours?: number;
    averageViewers?: number;
    peakViewers?: number;
    retentionRate?: number;
    watchTimeHours?: number;
    title?: string | null;
    gameName?: string | null;
    [key: string]: unknown;
}

export interface MonthlySummary {
    totalStreams: number;
    totalWatchTimeHours: number;
    totalStreamHours: number;
    overallAverageViewers: number;
    overallRetentionRate: number;
    highestPeakViewers: number;
}

export interface DayDistribution {
    day: string;
    count: number;
    percentage: number;
}

export interface TimelinePoint {
    label: string;
    watchTime: number;
    avgViewers: number;
    streamsCount: number;
}

export interface FrequencyBreakdown {
    totalStreams: number;
    totalWatchTimeHours: number;
    totalStreamHours: number;
    overallAverageViewers: number;
    overallRetentionRate: number;
    highestPeakViewers: number;
    streamsPerWeek: number;
    topDays: DayDistribution[];
    evolutionTimeline: TimelinePoint[];
}

/**
 * 1. Calcule les métriques de rétention et le Watch Time d'un live précis
 */
export function calculateRetentionMetrics(
    session: SessionInput,
    metrics: MetricPointInput[] = []
): RetentionMetrics {
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
    const durationHours = Math.max(0.1, Math.round(((endedAt - startedAt) / (1000 * 60 * 60)) * 10) / 10);

    // Calcul de la moyenne des spectateurs
    let averageViewers = 0;
    if (metrics && metrics.length > 0) {
        const sum = metrics.reduce((acc, m) => acc + (m.viewerCount || 0), 0);
        averageViewers = Math.round(sum / metrics.length);
    } else {
        averageViewers = session.peakViewers || 0;
    }

    const peakViewers = session.peakViewers || (metrics.length > 0 ? Math.max(...metrics.map(m => m.viewerCount || 0)) : 0);

    // Taux de rétention (Moyenne / Pic)
    const retentionRate = peakViewers > 0 ? Math.min(100, Math.round((averageViewers / peakViewers) * 100)) : 0;

    // Catégorisation de fidélité
    let retentionTier: RetentionTier = { label: 'Audience Volatile', badge: 'volatile', color: '#f59e0b' };
    if (retentionRate >= 85) {
        retentionTier = { label: 'Audience Captive', badge: 'captive', color: '#10b981' };
    } else if (retentionRate >= 65) {
        retentionTier = { label: 'Audience Stable', badge: 'stable', color: '#3b82f6' };
    }

    // Heures-Vues (Watch Time) = Moyenne * Heures streamées
    const watchTimeHours = Math.round(averageViewers * durationHours * 10) / 10;

    return {
        durationHours,
        averageViewers,
        peakViewers,
        retentionRate,
        retentionTier,
        watchTimeHours
    };
}

/**
 * 2. Agrège les métriques globales sur l'ensemble des streams (ex: 30 derniers jours)
 */
export function computeMonthlySummary(
    calculatedStreams: CalculatedStreamInput[] = []
): MonthlySummary {
    if (!calculatedStreams || calculatedStreams.length === 0) {
        return {
            totalStreams: 0,
            totalWatchTimeHours: 0,
            totalStreamHours: 0,
            overallAverageViewers: 0,
            overallRetentionRate: 0,
            highestPeakViewers: 0
        };
    }

    const totalStreams = calculatedStreams.length;
    const totalWatchTimeHours = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.watchTimeHours || 0), 0) * 10) / 10;
    const totalStreamHours = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.durationHours || 0), 0) * 10) / 10;
    const highestPeakViewers = Math.max(...calculatedStreams.map(s => s.peakViewers || 0));

    const sumRetention = calculatedStreams.reduce((acc, s) => acc + (s.retentionRate || 0), 0);
    const overallRetentionRate = Math.round(sumRetention / totalStreams);

    const sumAvgViewers = calculatedStreams.reduce((acc, s) => acc + (s.averageViewers || 0), 0);
    const overallAverageViewers = Math.round(sumAvgViewers / totalStreams);

    return {
        totalStreams,
        totalWatchTimeHours,
        totalStreamHours,
        overallAverageViewers,
        overallRetentionRate,
        highestPeakViewers
    };
}

/**
 * 3. Calcule la fréquence de stream et l'évolution temporelle (Hebdo, Mensuel, Annuel, Tout)
 */
export function computeFrequencyAndBreakdown(
    calculatedStreams: CalculatedStreamInput[] = [],
    period: string = 'all'
): FrequencyBreakdown {
    if (!calculatedStreams || calculatedStreams.length === 0) {
        return {
            totalStreams: 0,
            totalWatchTimeHours: 0,
            totalStreamHours: 0,
            overallAverageViewers: 0,
            overallRetentionRate: 0,
            highestPeakViewers: 0,
            streamsPerWeek: 0,
            topDays: [],
            evolutionTimeline: []
        };
    }

    const totalStreams = calculatedStreams.length;
    const totalWatchTimeHours = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.watchTimeHours || 0), 0) * 10) / 10;
    const totalStreamHours = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.durationHours || 0), 0) * 10) / 10;
    const highestPeakViewers = Math.max(...calculatedStreams.map(s => s.peakViewers || 0));
    const overallRetentionRate = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.retentionRate || 0), 0) / totalStreams);
    const overallAverageViewers = Math.round(calculatedStreams.reduce((acc, s) => acc + (s.averageViewers || 0), 0) / totalStreams);

    // Répartition par jour de la semaine (Mardi, Jeudi, etc.)
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayCounts: Record<string, number> = {};
    dayNames.forEach(d => { dayCounts[d] = 0; });

    calculatedStreams.forEach(s => {
        if (s.startedAt) {
            const day = dayNames[new Date(s.startedAt).getDay()];
            if (day && dayCounts[day] !== undefined) dayCounts[day]++;
        }
    });

    const topDays: DayDistribution[] = Object.entries(dayCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([day, count]) => ({ day, count, percentage: Math.round((count / totalStreams) * 100) }));

    // Calcul de la fréquence moyenne de stream par semaine
    const validDates = calculatedStreams
        .filter(s => s.startedAt !== undefined && s.startedAt !== null)
        .map(s => new Date(s.startedAt as Date | string).getTime());

    let streamsPerWeek = 0;
    if (validDates.length > 0) {
        const minDate = Math.min(...validDates);
        const maxDate = Math.max(...validDates);
        const diffWeeks = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 7));
        streamsPerWeek = Math.round((totalStreams / diffWeeks) * 10) / 10;
    }

    // Timeline chronologique pour le grand graphique d'évolution
    interface TempTimelineData {
        key: string;
        label: string;
        watchTime: number;
        avgViewers: number;
        count: number;
    }

    const timelineMap: Record<string, TempTimelineData> = {};
    const isShortPeriod = period === 'weekly' || period === 'monthly';

    calculatedStreams.forEach(s => {
        if (s.startedAt) {
            const d = new Date(s.startedAt);
            const key = isShortPeriod
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = isShortPeriod
                ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            if (!timelineMap[key]) {
                timelineMap[key] = {
                    key,
                    label,
                    watchTime: 0,
                    avgViewers: 0,
                    count: 0
                };
            }
            timelineMap[key].watchTime += (s.watchTimeHours || 0);
            timelineMap[key].avgViewers += (s.averageViewers || 0);
            timelineMap[key].count++;
        }
    });

    const evolutionTimeline: TimelinePoint[] = Object.values(timelineMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(t => ({
            label: t.label,
            watchTime: Math.round(t.watchTime * 10) / 10,
            avgViewers: Math.round(t.avgViewers / t.count),
            streamsCount: t.count
        }));

    return {
        totalStreams,
        totalWatchTimeHours,
        totalStreamHours,
        overallAverageViewers,
        overallRetentionRate,
        highestPeakViewers,
        streamsPerWeek,
        topDays,
        evolutionTimeline
    };
}
