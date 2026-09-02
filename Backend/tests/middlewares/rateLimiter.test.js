import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authLimiter, apiLimiter } from '../../src/middlewares/rateLimiter.js';

describe('🛡️ TDD : Limitation de débit / Anti-Bruteforce (rateLimiter.js)', () => {
    
    it('doit bloquer les requêtes après 5 tentatives consécutives avec un code HTTP 429', async () => {
        const app = express();
        app.use(express.json());

        // Route de test protégée par le authLimiter
        app.post('/test-login', authLimiter, (req, res) => {
            res.status(200).json({ success: true });
        });

        // 1. Envoyer 5 requêtes autorisées
        for (let i = 0; i < 5; i++) {
            const res = await request(app).post('/test-login').send({});
            expect(res.status).toBe(200);
        }

        // 2. La 6ème requête DOIT être bloquée (HTTP 429 Too Many Requests)
        const blockedRes = await request(app).post('/test-login').send({});

        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body).toHaveProperty('error');
        expect(blockedRes.body.error).toContain('Trop de tentatives');
    });

    it('doit inclure les en-têtes standards RateLimit dans la réponse', async () => {
        const app = express();
        app.use(express.json());
        app.get('/test-api', apiLimiter, (req, res) => res.json({ ok: true }));

        const res = await request(app).get('/test-api');

        expect(res.status).toBe(200);
        // Vérifie la présence des en-têtes standards IETF RateLimit
        const hasRateLimitHeader = !!(res.headers['ratelimit'] || res.headers['ratelimit-limit'] || res.headers['ratelimit-policy']);
        expect(hasRateLimitHeader).toBe(true);
    });

});

