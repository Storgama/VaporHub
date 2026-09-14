import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('🛡️ TDD : En-têtes HTTP de Sécurité & Hardening (Points 64 à 71)', () => {

    it('ne doit PAS exposer l\'en-tête révélateur X-Powered-By (Point 70)', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('doit inclure l\'en-tête anti-clickjacking X-Frame-Options (Point 67)', async () => {
        const res = await request(app).get('/health');
        expect(['DENY', 'SAMEORIGIN']).toContain(res.headers['x-frame-options']);
    });

    it('doit inclure l\'en-tête anti-MIME-sniffing X-Content-Type-Options: nosniff (Point 66)', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('doit inclure l\'en-tête Referrer-Policy sécurisé (Point 68)', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['referrer-policy']).toBeDefined();
    });

    it('doit inclure l\'en-tête HSTS Strict-Transport-Security (Point 65)', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['strict-transport-security']).toBeDefined();
    });

});

