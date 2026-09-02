/**
 * 1. Calcule les métriques de rétention et le Watch Time d'un live précis
 */
export function calculateRetentionMetrics(session, metrics = []) {
    const startedAt = new Date(session.startedAt).getTime();
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
    let retentionTier = { label: 'Audience Volatile', badge: 'volatile', color: '#f59e0b' };
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
export function computeMonthlySummary(calculatedStreams = []) {
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