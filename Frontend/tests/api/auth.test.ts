import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginApi, registerApi, logoutApi } from '../../src/api/auth';
import * as clientModule from '../../src/api/client';

describe('🚪 API : Auth Endpoints (auth.ts)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loginApi doit envoyer les identifiants et renvoyer les données', async () => {
        const mockResponse = { accessToken: 'token123', user: { username: 'Test' } };
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        } as unknown as Response);

        const res = await loginApi('test@test.com', 'pass');
        expect(res).toEqual(mockResponse);
    });

    it('loginApi doit lever une erreur si la réponse n\'est pas ok', async () => {
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Mauvais mot de passe' })
        } as unknown as Response);

        await expect(loginApi('test@test.com', 'pass')).rejects.toThrow('Mauvais mot de passe');
    });

    it('registerApi doit envoyer les infos d\'inscription', async () => {
        const mockResponse = { message: 'Compte créé' };
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        } as unknown as Response);

        const res = await registerApi('NewUser', 'new@test.com', 'pass');
        expect(res).toEqual(mockResponse);
    });

    it('registerApi doit lever une erreur si l\'inscription échoue', async () => {
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Email existant' })
        } as unknown as Response);

        await expect(registerApi('NewUser', 'new@test.com', 'pass')).rejects.toThrow('Email existant');
    });

    it('logoutApi doit appeler /auth/logout', async () => {
        const mockSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({ ok: true } as unknown as Response);
        await logoutApi('refresh_token_to_delete');
        expect(mockSpy).toHaveBeenCalledTimes(1);
    });
});

