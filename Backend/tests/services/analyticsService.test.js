import { describe, it, expect } from 'vitest';
import { calculateRetentionMetrics, computeMonthlySummary } from '../../src/services/analyticsService.js';

describe('📊 TDD : Moteur de Calcul de Rétention & Watch Time (analyticsService.js)', () => {

    describe('1. Calcul de la Rétention d\'une Session (calculateRetentionMetrics)', () => {
        it('doit calculer une Rétention Captive (90%) et le Watch Time exact pour un live stable', () => {
            const mockSession = {
                id: 'sess_1',
                peakViewers: 100,
                startedAt: new Date('2026-09-01T14:00:00Z'),
                endedAt: new Date('2026-09-01T16:00:00Z') // 2 heures de live
            };

            const mockMetrics = [
                { timestamp: new Date('2026-09-01T14:00:00Z'), viewerCount: 80 },
                { timestamp: new Date('2026-09-01T14:30:00Z'), viewerCount: 95 },
                { timestamp: new Date('2026-09-01T15:00:00Z'), viewerCount: 100 },
                { timestamp: new Date('2026-09-01T15:30:00Z'), viewerCount: 85 }
            ]; // Moyenne = 90 spectateurs

            const result = calculateRetentionMetrics(mockSession, mockMetrics);

            expect(result.averageViewers).toBe(90);
            expect(result.peakViewers).toBe(100);
            expect(result.retentionRate).toBe(90); // (90 / 100) * 100
            expect(result.retentionTier.label).toBe('Audience Captive');
            expect(result.durationHours).toBe(2);
            expect(result.watchTimeHours).toBe(180); // 90 viewers * 2h = 180 heures-vues
        });

        it('doit catégoriser une Audience Volatile (< 65%) en cas de chute d\'audience', () => {
            const mockSession = {
                id: 'sess_2',
                peakViewers: 200, // Pic élevé (ex: raid)
                startedAt: new Date('2026-09-01T18:00:00Z'),
                endedAt: new Date('2026-09-01T19:00:00Z') // 1 heure
            };

            const mockMetrics = [
                { timestamp: new Date('2026-09-01T18:00:00Z'), viewerCount: 200 },
                { timestamp: new Date('2026-09-01T18:30:00Z'), viewerCount: 40 },
                { timestamp: new Date('2026-09-01T19:00:00Z'), viewerCount: 20 }
            ]; // Moyenne = 86.6 -> Rétention ~43%

            const result = calculateRetentionMetrics(mockSession, mockMetrics);

            expect(result.retentionRate).toBeLessThan(65);
            expect(result.retentionTier.label).toBe('Audience Volatile');
        });
    });

    describe('2. Résumé Global Mensuel (computeMonthlySummary)', () => {
        it('doit agréger correctement le Watch Time total et le Taux moyen de rétention', () => {
            const mockCalculatedStreams = [
                { watchTimeHours: 120, durationHours: 3, averageViewers: 40, retentionRate: 85, peakViewers: 50 },
                { watchTimeHours: 80, durationHours: 2, averageViewers: 40, retentionRate: 75, peakViewers: 60 }
            ];

            const summary = computeMonthlySummary(mockCalculatedStreams);

            expect(summary.totalStreams).toBe(2);
            expect(summary.totalWatchTimeHours).toBe(200); // 120h + 80h
            expect(summary.totalStreamHours).toBe(5); // 3h + 2h
            expect(summary.overallRetentionRate).toBe(80); // (85 + 75) / 2
            expect(summary.highestPeakViewers).toBe(60);
        });
    });

});

