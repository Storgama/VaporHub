import { describe, it, expect } from 'vitest';
import { 
    calculateRetentionMetrics, 
    computeMonthlySummary,
    computeFrequencyAndBreakdown 
} from '../../src/services/analyticsService.js';

describe('📊 TDD : Moteur de Calcul de Rétention & Fréquence (analyticsService.js)', () => {

    describe('1. Calcul de la Rétention d\'une Session (calculateRetentionMetrics)', () => {
        it('doit calculer une Rétention Captive (90%) et le Watch Time exact pour un live stable', () => {
            const mockSession = {
                id: 'sess_1',
                peakViewers: 100,
                startedAt: new Date('2026-09-01T14:00:00Z'),
                endedAt: new Date('2026-09-01T16:00:00Z')
            };

            const mockMetrics = [
                { timestamp: new Date('2026-09-01T14:00:00Z'), viewerCount: 80 },
                { timestamp: new Date('2026-09-01T14:30:00Z'), viewerCount: 95 },
                { timestamp: new Date('2026-09-01T15:00:00Z'), viewerCount: 100 },
                { timestamp: new Date('2026-09-01T15:30:00Z'), viewerCount: 85 }
            ];

            const result = calculateRetentionMetrics(mockSession, mockMetrics);

            expect(result.averageViewers).toBe(90);
            expect(result.peakViewers).toBe(100);
            expect(result.retentionRate).toBe(90);
            expect(result.retentionTier.label).toBe('Audience Captive');
            expect(result.durationHours).toBe(2);
            expect(result.watchTimeHours).toBe(180);
        });
    });

    describe('2. Calcul de la Fréquence & Répartition par Période (computeFrequencyAndBreakdown)', () => {
        it('doit calculer la fréquence hebdomadaire et identifier les jours de prédilection', () => {
            const mockStreams = [
                { startedAt: new Date('2026-09-01T19:00:00Z'), durationHours: 3, averageViewers: 50, watchTimeHours: 150 }, // Mardi
                { startedAt: new Date('2026-09-03T19:00:00Z'), durationHours: 3, averageViewers: 60, watchTimeHours: 180 }, // Jeudi
                { startedAt: new Date('2026-09-05T19:00:00Z'), durationHours: 4, averageViewers: 70, watchTimeHours: 280 }  // Samedi
            ];

            const breakdown = computeFrequencyAndBreakdown(mockStreams, 'monthly');

            expect(breakdown.totalStreams).toBe(3);
            expect(breakdown.totalWatchTimeHours).toBe(610); // 150 + 180 + 280
            expect(breakdown.streamsPerWeek).toBeGreaterThanOrEqual(0.7);
            expect(breakdown.topDays).toHaveLength(3); // Mardi, Jeudi, Samedi
            expect(breakdown.evolutionTimeline).toBeDefined();
        });
    });

});
