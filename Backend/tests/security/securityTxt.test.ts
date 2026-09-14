import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('🛡️ TDD : Standard security.txt RFC 9116 (Point 100)', () => {

    it('doit exposer /.well-known/security.txt en texte brut avec les mentions obligatoires', async () => {
        const res = await request(app).get('/.well-known/security.txt');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.text).toContain('Contact:');
        expect(res.text).toContain('Expires:');
    });

});

