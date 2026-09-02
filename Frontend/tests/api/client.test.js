import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpClient } from '../../src/api/client.js';

describe('🌐 API : Client HTTP (client.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit envoyer une requête avec les bons en-têtes JSON et Bearer si présent', async () => {
        localStorage.setItem('accessToken', 'my_secret_jwt');

        const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            status: 200,
            ok: true,
            json: async () => ({ success: true })
        });

        const res = await httpClient('/test-endpoint');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/test-endpoint');
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(options.headers['Authorization']).toBe('Bearer my_secret_jwt');
    });

    it('doit tenter un rafraîchissement de token si l\'API renvoie 401 et qu\'un refreshToken existe', async () => {
        localStorage.setItem('accessToken', 'expired_token');
        localStorage.setItem('refreshToken', 'valid_refresh');

        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ status: 401, ok: false })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ accessToken: 'new_fresh_token' })
            })
            .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ data: 'ok' }) });

        const res = await httpClient('/data');

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(localStorage.getItem('accessToken')).toBe('new_fresh_token');
    });

    it('doit vider le localStorage si le refresh token échoue', async () => {
        localStorage.setItem('accessToken', 'expired_token');
        localStorage.setItem('refreshToken', 'expired_refresh');

        const reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadMock, href: '' },
            writable: true,
            configurable: true
        });

        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ status: 401, ok: false })
            .mockResolvedValueOnce({ ok: false, status: 403 });

        await httpClient('/data');

        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(reloadMock).toHaveBeenCalledTimes(1);
    });
});
