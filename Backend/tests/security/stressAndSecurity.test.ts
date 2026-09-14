import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('🛡️ Stress-Test Sécurité & Résilience (Fuzzing & Anti-Exploits)', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('1. Résilience aux Injections SQL & Entrées Malveillantes (SQLi)', () => {
        const maliciousSqlPayloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "admin'--",
            "' UNION SELECT * FROM users --",
            "1; SELECT pg_sleep(5); --"
        ];

        it.each(maliciousSqlPayloads)(
            'doit neutraliser et rejeter le payload SQLi sur /api/auth/login : %s',
            async (sqlPayload) => {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: sqlPayload,
                        password: 'Password123!'
                    });

                // Zod doit bloquer avec 400 (format email invalide) ou renvoyer 401 si traité
                expect([400, 401]).toContain(res.status);
                expect(res.status).not.toBe(500);
                expect(res.body).toHaveProperty('error');
                // Aucune trace d'erreur SQL brute ou de fuite de syntaxe Postgres
                expect(JSON.stringify(res.body)).not.toMatch(/syntax error|pg_|drizzle|SELECT|DROP/i);
            }
        );

        it('doit rejeter proprement les paramètres de route corrompus (ex: /history/:sessionId)', async () => {
            const res = await request(app)
                .get('/api/twitch/history/1%27%20OR%201=1--')
                .set('Authorization', 'Bearer invalid_token');

            
            expect([401, 403]).toContain(res.status);
        });
    });

    describe('2. Protection contre la Pollution de Prototype (Prototype Pollution)', () => {
        it('doit ignorer ou supprimer les propriétés __proto__ et constructor du body', async () => {
            const maliciousPayload = JSON.parse('{"email":"valid@vaporhub.test","password":"Password123!","__proto__":{"polluted":true}}');

            const res = await request(app)
                .post('/api/auth/register')
                .send(maliciousPayload);

            // Vérifie que le prototype global n'a pas été pollué
            expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        });
    });

    describe('3. Saturation du Rate Limiter (Anti Brute-Force)', () => {
        it('doit bloquer avec 429 Too Many Requests après une rafale sur /api/auth/login', async () => {
            const burstRequests = Array.from({ length: 15 }).map(() =>
                request(app)
                    .post('/api/auth/login')
                    .send({ email: 'test@vaporhub.test', password: 'wrongpassword' })
            );

            const responses = await Promise.all(burstRequests);
            const statuses = responses.map(r => r.status);

            // Au moins une requête de la rafale doit recevoir 429
            expect(statuses).toContain(429);

            const rateLimitedResponse = responses.find(r => r.status === 429);
            expect(rateLimitedResponse?.body).toHaveProperty('error');
            expect(rateLimitedResponse?.body.error).toContain('Trop de tentatives');
        });
    });

    describe('4. Fuzzing & Falsification de Tokens JWT', () => {
        const forgedTokens = [
            'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiIxMjMifQ.', // Algorithme "none"
            'Bearer total_garbage_string_not_even_base64!@#$%',
            'Bearer eyJhbGciOiJIUzI1NiJ9.corrupted_payload.fake_signature',
            'Bearer ',
            ''
        ];

        it.each(forgedTokens)(
            'doit rejeter immédiatement le token forgé ou corrompu : %s',
            async (fakeToken) => {
                const res = await request(app)
                    .get('/api/twitch/current')
                    .set('Authorization', fakeToken);

                expect([401, 403]).toContain(res.status);
                expect(res.body).toHaveProperty('error');
            }
        );
    });

    describe('5. Payloads Massifs & Flooding (DoS Prevention)', () => {
        it('doit rejeter une chaîne de caractères de taille anormale sans saturer le serveur', async () => {
            const massiveString = 'A'.repeat(50000); // 50 Ko de texte dans un champ

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: `${massiveString}@vaporhub.test`,
                    password: massiveString
                });

            expect([400, 413, 429]).toContain(res.status);
            expect(res.status).not.toBe(500);
        });
    });

    describe('6. Tentatives d\'Injections XSS / Balises HTML', () => {
        it('ne doit pas crasher ni exécuter de payload HTML/Script dans les champs utilisateurs', async () => {
            const xssPayload = '<script>alert("XSS")</script>';

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'xss_test@vaporhub.test',
                    username: xssPayload,
                    password: 'SecurePassword123!'
                });

            // Doit répondre en JSON strict (pas de rendu HTML interprétable)
            expect(res.headers['content-type']).toContain('application/json');
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });
    });

    describe('7. Fuite d\'Informations (Zero Information Disclosure)', () => {
        it('ne doit jamais exposer de stack trace ou de détails internes dans les réponses d\'erreur', async () => {
            const res = await request(app).get('/api/route_inexistante_pour_test');

            expect(res.status).toBe(404);
            expect(res.body.stack).toBeUndefined();
            expect(res.body.trace).toBeUndefined();
            expect(res.body.internal).toBeUndefined();
        });
    });

});