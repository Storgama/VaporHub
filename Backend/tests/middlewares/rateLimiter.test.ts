import { describe, it, expect, vi, beforeEach } from 'vitest';

import { authLimiter, apiLimiter } from '../../src/middlewares/rateLimiter.js';
import express from 'express';
import request from 'supertest';


describe('🛡️ Middleware : rateLimiter', () => {

    beforeEach(() => {
        authLimiter.resetKey('::ffff:127.0.0.1');
        authLimiter.resetKey('127.0.0.1');
        apiLimiter.resetKey('::ffff:127.0.0.1');
        apiLimiter.resetKey('127.0.0.1');
    });

    it('doit décrémenter le compteur restant et exposer les en-têtes IETF draft-7', async () => {
        const app = express();
        
        app.use(express.json());
        
        app.post('/test-headers', authLimiter, (_req, res) => {
            res.status(200).json({ ok: true });
        });
        
        const res = await request(app).post('/test-headers').send({});
        
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit']).toBeDefined();
        expect(res.headers['ratelimit']).toContain('limit=5');
        expect(res.headers['ratelimit']).toContain('remaining=4');
    });


    it('doit rejeter la 6ème tentative avec un code 429 et un message explicite', async () => {
        const app = express();
        
        app.use(express.json());
        app.post('/test-burst', authLimiter, (_req, res) => {
            res.status(200).json({ ok: true });
        });

        // 5 requêtes autorisées
        for (let i = 0; i < 5; i++) {
            const okRes = await request(app).post('/test-burst').send({});
            expect(okRes.status).toBe(200);
        }

        // 6ème requête bloquée
        const blockedRes = await request(app).post('/test-burst').send({});
        expect(blockedRes.status).toBe(429);
        expect(blockedRes.headers['ratelimit']).toContain('remaining=0');
        expect(blockedRes.body).toEqual({
            error: expect.stringContaining('Trop de tentatives de connexion')
        });
    });

    it('doit isoler les quotas par adresse IP distincte', async () => {
        const app = express();

        app.set('trust proxy', true); // Pour autoriser X-Forwarded-For
        
        app.use(express.json());

        app.post('/test-ip-isolation', authLimiter, (_req, res) => {
            res.status(200).json({ ok: true });
        });

        const ipAttacker = '198.51.100.1';
        const ipLegit = '198.51.100.2';

        // L'attaquant épuise son quota (5 requêtes)
        for (let i = 0; i < 5; i++) {
            await request(app)
                .post('/test-ip-isolation')
                .set('X-Forwarded-For', ipAttacker)
                .send({});
        }

        // L'attaquant est bloqué au 6ème appel
        const attackerBlocked = await request(app)
            .post('/test-ip-isolation')
            .set('X-Forwarded-For', ipAttacker)
            .send({});
        expect(attackerBlocked.status).toBe(429);

        // L'utilisateur légitime doit toujours passer avec succès
        const legitRes = await request(app)
            .post('/test-ip-isolation')
            .set('X-Forwarded-For', ipLegit)
            .send({});

        expect(legitRes.status).toBe(200);
        expect(legitRes.headers['ratelimit']).toContain('remaining=4');
    });

    it('doit renvoyer le message d\'erreur exact pour le limiteur global apiLimiter', async () => {
        const app = express();

        app.use(express.json());
        app.get('/test-api-limit', apiLimiter, (_req, res) => {
            res.status(200).json({ ok: true });
        });

        // 100 requêtes autorisées
        for (let i = 0; i < 100; i++) {
            const okRes = await request(app).get('/test-api-limit');
            expect(okRes.status).toBe(200);
        }

        // 101ème requête bloquée
        const blockedRes = await request(app).get('/test-api-limit');
        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body).toEqual({
            error: "Trop de requêtes envoyées à l'API. Ralentissez un instant."
        });
    });


    it('doit inclure les en-têtes standards IETF RateLimit sur apiLimiter (Protection Anti-DoS)', async () => {
        const app = express();

        app.use(express.json());

        app.get('/test-api-headers', apiLimiter, (_req, res) => {
            res.status(200).json({ ok: true });
        });

        const res = await request(app).get('/test-api-headers');

        expect(res.status).toBe(200);
        expect(res.headers['ratelimit']).toBeDefined();
        expect(res.headers['ratelimit']).toContain('limit=100');
        expect(res.headers['ratelimit']).toContain('remaining=99');
    });
});