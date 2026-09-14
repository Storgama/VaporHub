import { describe, it, expect } from 'vitest';
import { 
    calculateRetentionMetrics, 
    computeMonthlySummary,
    computeFrequencyAndBreakdown 
} from '../../src/services/analyticsService.js';

describe('📊 Service : analyticsService', () => {

    describe('1. calculateRetentionMetrics', () => {
        it('doit calculer une Rétention Captive (>= 85%) et le Watch Time exact', () => {
            const session = {
                startedAt: new Date('2026-09-01T14:00:00Z'),
                endedAt: new Date('2026-09-01T16:00:00Z'),
                peakViewers: 100
            };
            const metrics = [
                { viewerCount: 80 },
                { viewerCount: 95 },
                { viewerCount: 100 },
                { viewerCount: 85 }
            ];

            const result = calculateRetentionMetrics(session, metrics);

            expect(result.durationHours).toBe(2);
            expect(result.averageViewers).toBe(90);
            expect(result.peakViewers).toBe(100);
            expect(result.retentionRate).toBe(90);
            expect(result.retentionTier.badge).toBe('captive');
            expect(result.retentionTier.label).toBe('Audience Captive');
            expect(result.watchTimeHours).toBe(180);
        });

        it('doit classifier en Audience Stable (65% <= taux < 85%) et Volatile (< 65%)', () => {
            const sessionStable = {
                startedAt: new Date('2026-09-01T10:00:00Z'),
                endedAt: new Date('2026-09-01T12:00:00Z'),
                peakViewers: 100
            };
            const metricsStable = [{ viewerCount: 70 }];
            const resStable = calculateRetentionMetrics(sessionStable, metricsStable);
            expect(resStable.retentionTier.badge).toBe('stable');

            const sessionVolatile = {
                startedAt: new Date('2026-09-01T10:00:00Z'),
                endedAt: new Date('2026-09-01T12:00:00Z'),
                peakViewers: 100
            };
            const metricsVolatile = [{ viewerCount: 40 }];
            const resVolatile = calculateRetentionMetrics(sessionVolatile, metricsVolatile);
            expect(resVolatile.retentionTier.badge).toBe('volatile');
        });

        it('doit gérer un stream avec 0 viewers sans division par zéro', () => {
            const session = {
                startedAt: new Date('2026-09-01T14:00:00Z'),
                endedAt: new Date('2026-09-01T15:00:00Z'),
                peakViewers: 0
            };

            const result = calculateRetentionMetrics(session, []);

            expect(result.retentionRate).toBe(0);
            expect(result.averageViewers).toBe(0);
            expect(result.watchTimeHours).toBe(0);
        });
    });

    describe('2. computeMonthlySummary', () => {
        it('doit renvoyer des compteurs à zéro si la liste de streams est vide', () => {
            const summary = computeMonthlySummary([]);
            expect(summary.totalStreams).toBe(0);
            expect(summary.totalWatchTimeHours).toBe(0);
            expect(summary.highestPeakViewers).toBe(0);
        });

        it('doit agréger correctement plusieurs streams', () => {
            const streams = [
                { watchTimeHours: 100, durationHours: 2, peakViewers: 50, retentionRate: 80, averageViewers: 50 },
                { watchTimeHours: 200, durationHours: 4, peakViewers: 120, retentionRate: 60, averageViewers: 50 }
            ];

            const summary = computeMonthlySummary(streams);

            expect(summary.totalStreams).toBe(2);
            expect(summary.totalWatchTimeHours).toBe(300);
            expect(summary.totalStreamHours).toBe(6);
            expect(summary.highestPeakViewers).toBe(120);
            expect(summary.overallRetentionRate).toBe(70);
            expect(summary.overallAverageViewers).toBe(50);
        });
    });

    describe('3. computeFrequencyAndBreakdown', () => {
        it('doit renvoyer un état vide cohérent sur liste vide', () => {
            const breakdown = computeFrequencyAndBreakdown([]);
            expect(breakdown.totalStreams).toBe(0);
            expect(breakdown.topDays).toEqual([]);
            expect(breakdown.evolutionTimeline).toEqual([]);
        });

        it('doit calculer la fréquence hebdomadaire et identifier les jours phares', () => {
            const mockStreams = [
                { startedAt: new Date('2026-09-01T19:00:00Z'), durationHours: 3, averageViewers: 50, watchTimeHours: 150 }, // Mardi
                { startedAt: new Date('2026-09-03T19:00:00Z'), durationHours: 3, averageViewers: 60, watchTimeHours: 180 }, // Jeudi
                { startedAt: new Date('2026-09-05T19:00:00Z'), durationHours: 4, averageViewers: 70, watchTimeHours: 280 }  // Samedi
            ];

            const breakdown = computeFrequencyAndBreakdown(mockStreams, 'monthly');

            expect(breakdown.totalStreams).toBe(3);
            expect(breakdown.totalWatchTimeHours).toBe(610);
            expect(breakdown.streamsPerWeek).toBeGreaterThanOrEqual(0.7);
            expect(breakdown.topDays).toHaveLength(3);
            expect(breakdown.evolutionTimeline).toHaveLength(3);
        });
    });

});