import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('🌐 Serveur Express Global (app.js)', () => {
    it('doit renvoyer 404 en JSON sur une route inconnue', async () => {
        const res = await request(app).get('/api/route_totalement_inconnue');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Route non trouvée');
    });

    it('doit répondre sur l\'endpoint /health', async () => {
        const res = await request(app).get('/health');

        // /health peut répondre 200 ou 503 selon la connexion BDD en test, mais doit être un JSON valide
        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty('status');
    });
});

