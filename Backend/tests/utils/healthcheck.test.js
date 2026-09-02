import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runHealthCheck } from '../../src/utils/healthcheck.js';
import { db } from '../../src/db/initBdd.js';

vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        execute: vi.fn()
    }
}));

describe('🏥 Utils : Healthcheck (healthcheck.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit renvoyer un statut OK et database: UP quand la BDD répond', async () => {
        db.execute.mockResolvedValueOnce({});

        const health = await runHealthCheck();

        expect(health.status).toBe('ok');
        expect(health.checks.database.status).toBe('UP');
        expect(health.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
        expect(health.checks.database.error).toBeNull();
    });

    it('doit renvoyer un statut KO et capturer l\'erreur quand la BDD échoue', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        db.execute.mockRejectedValueOnce(new Error('Connection Refused'));

        const health = await runHealthCheck();

        expect(health.status).toBe('KO');
        expect(health.checks.database.status).toBe('DOWN');
        expect(health.checks.database.error).toBe('Connection Refused');
    });
});

