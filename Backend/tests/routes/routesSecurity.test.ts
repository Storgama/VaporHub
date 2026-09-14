import { describe, it, expect } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';

describe('🛡️ Pipeline & Gardes de Sécurité des Routes', () => {

    describe('1. Protection 401 sur les routes Twitch privées', () => {
        const protectedTwitchRoutes = [
            '/api/twitch/auth',
            '/api/twitch/current',
            '/api/twitch/history',
            '/api/twitch/history/session_test_123',
            '/api/twitch/analytics/summary',
            '/api/twitch/analytics/breakdown',
            '/api/twitch/ads'
        ];

        it.each(protectedTwitchRoutes)(
            'doit bloquer avec 401 GET %s sans token d\'authentification',
            async (path) => {
                const res = await request(app).get(path);

                expect(res.status).toBe(401);
                expect(res.body).toHaveProperty('error');
                expect(res.body.error).toContain('Token d\'authentification manquant');
            }
        );
    });

    describe('2. Routes publiques d\'authentification (Exclues de 401 mais protégées par Zod)', () => {
        it('POST /api/auth/register doit bloquer avec 400 sur un body invalide (garde Zod actif)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({}); // Body vide

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Des champs sont vides');
        });

        it('POST /api/auth/login doit bloquer avec 400 sur un body invalide (garde Zod actif)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({}); // Body vide

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Des champs sont vides');
        });
    });

    describe('3. Route publique OAuth Twitch Callback', () => {
        it('GET /api/twitch/callback ne doit PAS renvoyer 401 pour absence de Bearer token', async () => {
            const res = await request(app).get('/api/twitch/callback');

            // Le callback rejette 400 s'il manque le code OAuth, mais ne doit pas renvoyer 401
            expect(res.status).not.toBe(401);
        });
    });

});