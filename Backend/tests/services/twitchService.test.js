import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    buildAuthUrl, 
    fetchUserProfile, 
    fetchLiveStream, 
    exchangeCodeForTokens, 
    getValidAccessToken 
} from '../../src/services/twitchService.js';
import { encrypt } from '../../src/utils/encryption.js';
import { db } from '../../src/db/initBdd.js';

vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        update: vi.fn()
    }
}));

describe('🎮 Services : Twitch API Client (twitchService.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        process.env.TWITCH_CLIENT_ID = 'test_twitch_client_id';
        process.env.TWITCH_CLIENT_SECRET = 'test_twitch_client_secret';
        process.env.TWITCH_REDIRECT_URI = 'http://localhost:3000/api/twitch/callback';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit construire l\'URL d\'autorisation OAuth Twitch avec le state userId', () => {
        const url = buildAuthUrl('user_uuid_12345');

        expect(url).toContain('https://id.twitch.tv/oauth2/authorize');
        expect(url).toContain('client_id=test_twitch_client_id');
        expect(url).toContain('state=user_uuid_12345');
        expect(url).toContain('user%3Aread%3Aemail');
    });

    it('doit récupérer le profil utilisateur Twitch avec succès', async () => {
        const mockProfile = { id: '123456', display_name: 'SuperStreamer', profile_image_url: 'https://avatar.png' };
        
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [mockProfile] })
        });

        const profile = await fetchUserProfile('123456', 'fake_access_token');

        expect(profile).toEqual(mockProfile);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('doit retourner null si l\'utilisateur Twitch n\'existe pas', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] })
        });

        const profile = await fetchUserProfile('inexistant', 'fake_access_token');
        expect(profile).toBeNull();
    });

    it('doit récupérer le flux live actif', async () => {
        const mockStream = { id: 'stream_999', title: 'Mon Live', viewer_count: 42 };

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [mockStream] })
        });

        const stream = await fetchLiveStream('123456', 'fake_access_token');
        expect(stream).toEqual(mockStream);
    });

    it('doit retourner null si la chaîne est hors ligne', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] })
        });

        const stream = await fetchLiveStream('123456', 'fake_access_token');
        expect(stream).toBeNull();
    });

    it('doit échanger un code d\'autorisation contre des tokens', async () => {
        const mockTokenResponse = { access_token: 'new_token', refresh_token: 'new_refresh', expires_in: 14400 };

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenResponse
        });

        const tokens = await exchangeCodeForTokens('auth_code_123');
        expect(tokens).toEqual(mockTokenResponse);
    });

    it('doit renvoyer le token en clair s\'il n\'est pas encore expiré', async () => {
        const tokenRecord = {
            accessToken: encrypt('token_encore_valide'),
            expiresAt: new Date(Date.now() + 3600 * 1000)
        };

        const token = await getValidAccessToken(tokenRecord);
        expect(token).toBe('token_encore_valide');
    });

    describe('Auto-Refresh du token expiré', () => {
        it('doit rafraîchir le token auprès de Twitch et mettre à jour la BDD si expiré', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('ancien_refresh_token'),
                expiresAt: new Date(Date.now() - 1000) // Expiré
            };

            const mockRefreshResponse = {
                access_token: 'tout_nouveau_token',
                refresh_token: 'tout_nouveau_refresh',
                expires_in: 14400
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockRefreshResponse
            });

            db.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce({})
                })
            });

            const newToken = await getValidAccessToken(tokenRecord);

            expect(newToken).toBe('tout_nouveau_token');
            expect(db.update).toHaveBeenCalled();
        });

        it('doit retourner null si Twitch rejette la demande de refresh', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('refresh_revoque'),
                expiresAt: new Date(Date.now() - 1000)
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Invalid refresh token' })
            });

            const newToken = await getValidAccessToken(tokenRecord);
            expect(newToken).toBeNull();
        });

        it('doit capturer les exceptions réseau et retourner null proprement', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('refresh_valide'),
                expiresAt: new Date(Date.now() - 1000)
            };

            vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Erreur réseau'));

            const newToken = await getValidAccessToken(tokenRecord);
            expect(newToken).toBeNull();
        });
    });
});
