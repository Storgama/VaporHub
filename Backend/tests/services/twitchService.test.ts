import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    mockUpdateResolve,
    expectUpdateCalled 
} from '../helpers/dbMock.js';

import { 
    buildAuthUrl, 
    fetchUserProfile, 
    fetchLiveStream, 
    fetchBatchLiveStreams,
    exchangeCodeForTokens, 
    getValidAccessToken,
    fetchAdSchedule
} from '../../src/services/twitchService.js';
import { encrypt } from '../../src/utils/encryption.js';

describe('📊 Services : twitchService)', () => {
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

    it('doit construire l\'URL d\'autorisation OAuth Twitch avec le state userId et les scopes ads', () => {
        const url = buildAuthUrl('user_uuid_12345');

        expect(url).toContain('https://id.twitch.tv/oauth2/authorize');
        expect(url).toContain('client_id=test_twitch_client_id');
        expect(url).toContain('state=user_uuid_12345');
        expect(url).toContain('user%3Aread%3Aemail');
        expect(url).toContain('channel%3Aread%3Aads');
    });

    it('doit récupérer le profil utilisateur Twitch avec succès', async () => {
        const mockProfile = { id: '123456', display_name: 'SuperStreamer', profile_image_url: 'https://avatar.png' };
        
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [mockProfile] })
        } as unknown as Response);

        const profile = await fetchUserProfile('123456', 'fake_access_token');

        expect(profile).toEqual(mockProfile);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('doit retourner null si l\'utilisateur Twitch n\'existe pas', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] })
        } as unknown as Response);

        const profile = await fetchUserProfile('inexistant', 'fake_access_token');
        expect(profile).toBeNull();
    });

    it('doit récupérer le flux live actif', async () => {
        const mockStream = { id: 'stream_999', title: 'Mon Live', viewer_count: 42 };

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [mockStream] })
        } as unknown as Response);

        const stream = await fetchLiveStream('123456', 'fake_access_token');
        expect(stream).toEqual(mockStream);
    });

    it('doit retourner null si la chaîne est hors ligne', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] })
        } as unknown as Response);

        const stream = await fetchLiveStream('123456', 'fake_access_token');
        expect(stream).toBeNull();
    });

    it('doit récupérer plusieurs flux live en une seule requête (Batch)', async () => {
        const mockStreams = [
            { id: 's1', user_id: '111', viewer_count: 50 },
            { id: 's2', user_id: '222', viewer_count: 100 }
        ];

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockStreams })
        } as unknown as Response);

        const streams = await fetchBatchLiveStreams(['111', '222'], 'fake_token');
        expect(streams).toEqual(mockStreams);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('user_id=111&user_id=222'),
            expect.any(Object)
        );
    });

    describe('📡 fetchAdSchedule', () => {
        it('doit récupérer le calendrier publicitaire avec compte à rebours et pré-roll', async () => {
            const mockAdData = {
                snooze_count: 1,
                snooze_refresh_at: 1698774000,
                next_ad_at: 1698774600,
                duration: 90,
                preroll_free_time: 1200,
                last_ad_at: 1698771000
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [mockAdData] })
            } as unknown as Response);

            const adSchedule = await fetchAdSchedule('123456', 'fake_access_token');

            expect(adSchedule).toEqual(mockAdData);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/channels/ads?broadcaster_id=123456'),
                expect.objectContaining({
                    headers: {
                        'Client-Id': 'test_twitch_client_id',
                        'Authorization': 'Bearer fake_access_token'
                    }
                })
            );
        });

        it('doit retourner null si le streamer n\'est pas affilié/partenaire ou en cas d\'erreur', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Not an affiliate or partner' })
            } as unknown as Response);

            const adSchedule = await fetchAdSchedule('123456', 'fake_access_token');
            expect(adSchedule).toBeNull();
        });
    });

    it('doit échanger un code d\'autorisation contre des tokens', async () => {
        const mockTokenResponse = { access_token: 'new_token', refresh_token: 'new_refresh', expires_in: 14400 };

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenResponse
        } as unknown as Response);

        const tokens = await exchangeCodeForTokens('auth_code_123');
        expect(tokens).toEqual(mockTokenResponse);
    });

    it('doit renvoyer le token en clair s\'il n\'est pas encore expiré', async () => {
        const tokenRecord = {
            id: 'token_1',
            userId: 'user_1',
            provider: 'twitch',
            providerAccountId: '123',
            accessToken: encrypt('token_encore_valide'),
            refreshToken: encrypt('refresh_valide'),
            expiresAt: new Date(Date.now() + 3600 * 1000),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const token = await getValidAccessToken(tokenRecord);
        expect(token).toBe('token_encore_valide');
    });

    describe('Auto-Refresh du token expiré', () => {
        it('doit rafraîchir le token auprès de Twitch et mettre à jour la BDD si expiré', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                userId: 'user_1',
                provider: 'twitch',
                providerAccountId: '123',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('ancien_refresh_token'),
                expiresAt: new Date(Date.now() - 1000), // Expiré
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockRefreshResponse = {
                access_token: 'tout_nouveau_token',
                refresh_token: 'tout_nouveau_refresh',
                expires_in: 14400
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockRefreshResponse
            } as unknown as Response);

            mockUpdateResolve();

            const newToken = await getValidAccessToken(tokenRecord);

            expect(newToken).toBe('tout_nouveau_token');
            expectUpdateCalled();
        });

        it('doit retourner null si Twitch rejette la demande de refresh', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                userId: 'user_1',
                provider: 'twitch',
                providerAccountId: '123',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('refresh_revoque'),
                expiresAt: new Date(Date.now() - 1000),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Invalid refresh token' })
            } as unknown as Response);

            const newToken = await getValidAccessToken(tokenRecord);
            expect(newToken).toBeNull();
        });

        it('doit capturer les exceptions réseau et retourner null proprement', async () => {
            const tokenRecord = {
                id: 'token_db_id_1',
                userId: 'user_1',
                provider: 'twitch',
                providerAccountId: '123',
                accessToken: encrypt('ancien_token'),
                refreshToken: encrypt('refresh_valide'),
                expiresAt: new Date(Date.now() - 1000),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Erreur réseau'));

            const newToken = await getValidAccessToken(tokenRecord);
            expect(newToken).toBeNull();
        });
    });
});