import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

import app from '../src/app.js';
import * as healthcheckUtils from '../src/utils/healthcheck.js';

describe('🌐 app.ts', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        process.env.FRONTEND_URL = 'http://localhost:5173';
        process.env.SECURITY_CONTACT = 'mailto:security@vaporhub.app';
    });

    describe('1. Routes de Santé (Healthchecks)', () => {
        it('doit renvoyer 200 et le rapport de santé quand le système est nominal (UP)', async () => {
            vi.spyOn(healthcheckUtils, 'runHealthCheck').mockResolvedValueOnce({
                status: 'ok',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { status: 'UP', latencyMs: 5, error: null }
                }
            });

            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.checks.database.status).toBe('UP');
        });

        it('doit renvoyer 503 quand la BDD est en échec (DOWN)', async () => {
            vi.spyOn(healthcheckUtils, 'runHealthCheck').mockResolvedValueOnce({
                status: 'KO',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { status: 'DOWN', latencyMs: 0, error: 'Connection refused' }
                }
            });

            const res = await request(app).get('/health');

            expect(res.status).toBe(503);
            expect(res.body.status).toBe('KO');
            expect(res.body.checks.database.status).toBe('DOWN');
        });

        it('doit répondre sur le ping interne /api/health', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                status: 'ok',
                service: 'Varpohub BackEnd API'
            });
        });
    });

    describe('2. Sécurité & Conformité RFC', () => {
        it('doit exposer /.well-known/security.txt conforme (RFC 9116)', async () => {
            const res = await request(app).get('/.well-known/security.txt');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/plain');
            expect(res.text).toContain('Contact: mailto:security@vaporhub.app');
            expect(res.text).toContain('Expires:');
            expect(res.text).toContain('Preferred-Languages: fr, en');
        });

        it('doit configurer CORS avec le domaine frontend autorisé et credentials: true', async () => {
            const res = await request(app)
                .get('/api/health')
                .set('Origin', 'http://localhost:5173');

            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
            expect(res.headers['access-control-allow-credentials']).toBe('true');
        });
    });

    describe('3. Gestion des Erreurs et 404', () => {
        it('doit renvoyer 404 en JSON sur une route inexistante', async () => {
            const res = await request(app).get('/api/route_totalement_inconnue');

            expect(res.status).toBe(404);
            expect(res.body).toEqual({
                error: 'Route non trouvée sur Vaporhub API'
            });
        });
    });
});