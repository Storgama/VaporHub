import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockExecuteResolve, mockExecuteReject } from '../helpers/dbMock.js';
import { runHealthCheck } from '../../src/utils/healthcheck.js';

describe('🏥 Utils : Healthcheck (healthcheck.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit renvoyer un statut OK et database: UP quand la BDD répond', async () => {
        mockExecuteResolve({});

        const health = await runHealthCheck();

        expect(health.status).toBe('ok');
        expect(health.checks.database.status).toBe('UP');
        expect(health.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
        expect(health.checks.database.error).toBeNull();
    });

    it('doit renvoyer un statut KO et capturer l\'erreur quand la BDD échoue', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mockExecuteReject(new Error('Connection Refused'));

        const health = await runHealthCheck();

        expect(health.status).toBe('KO');
        expect(health.checks.database.status).toBe('DOWN');
        expect(health.checks.database.error).toBe('Connection Refused');
    });
});