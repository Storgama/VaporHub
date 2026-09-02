import { describe, it, expect, beforeEach } from 'vitest';
import { 
    generateAccessToken, 
    generateRefreshToken, 
    verifyAccessToken, 
    verifyRefreshToken 
} from '../../src/utils/jwt.js';

describe('🎟️ Utils : Tokens JWT (jwt.js)', () => {
    const payload = { userId: 'user_uuid_12345', role: 'streamer' };

    beforeEach(() => {
        process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_key_123';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_456';
        process.env.JWT_ACCESS_EXPIRES_IN = '15m';
        process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    });

    it('doit générer et valider un Access Token valide', () => {
        const token = generateAccessToken(payload);

        expect(typeof token).toBe('string');
        
        const decoded = verifyAccessToken(token);
        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.role).toBe(payload.role);
        expect(decoded.exp).toBeDefined();
    });

    it('doit générer et valider un Refresh Token valide', () => {
        const token = generateRefreshToken(payload);

        expect(typeof token).toBe('string');
        
        const decoded = verifyRefreshToken(token);
        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.role).toBe(payload.role);
    });

    it('doit échouer si l\'Access Token est vérifié avec le mauvais secret', () => {
        const token = generateAccessToken(payload);

        process.env.JWT_ACCESS_SECRET = 'autre_secret_invalide';
        expect(() => verifyAccessToken(token)).toThrow();
    });

    it('doit échouer si le Refresh Token est vérifié avec le secret de l\'Access Token', () => {
        const refreshToken = generateRefreshToken(payload);

        expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
});

