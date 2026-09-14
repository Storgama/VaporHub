import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../../src/state/useAuth.js';
import * as authApi from '../../src/api/auth.js';

describe('🖥️ State : useAuth (useAuth.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('doit initialiser l\'état non authentifié si aucun token n\'est en localStorage', () => {
        const { user, isAuthenticated } = useAuth();

        expect(user.value).toBeNull();
        expect(isAuthenticated.value).toBe(false);
    });

    it('doit connecter l\'utilisateur, sauvegarder les tokens et passer isAuthenticated à true', async () => {
        const mockAuthResponse = {
            accessToken: 'mock_jwt_access',
            refreshToken: 'mock_jwt_refresh',
            user: { id: 'u1', username: 'StreamerPro', email: 'pro@test.com' }
        };

        vi.spyOn(authApi, 'loginApi').mockResolvedValueOnce(mockAuthResponse);

        const { login, user, isAuthenticated } = useAuth();

        await login('pro@test.com', 'password123');

        expect(user.value).toBe('StreamerPro');
        expect(isAuthenticated.value).toBe(true);
        expect(localStorage.getItem('accessToken')).toBe('mock_jwt_access');
        expect(localStorage.getItem('refreshToken')).toBe('mock_jwt_refresh');
        expect(localStorage.getItem('username')).toBe('StreamerPro');
    });

    it('doit appeler registerApi lors de l\'inscription', async () => {
        const mockRegisterResponse = { message: 'Utilisateur créé' };
        vi.spyOn(authApi, 'registerApi').mockResolvedValueOnce(mockRegisterResponse);

        const { register } = useAuth();
        const res = await register('NewUser', 'new@test.com', 'password123');

        expect(res).toEqual(mockRegisterResponse);
    });

    it('doit déconnecter l\'utilisateur et vider le localStorage lors du logout', async () => {
        localStorage.setItem('refreshToken', 'token_to_revoke');
        localStorage.setItem('accessToken', 'token_access');
        localStorage.setItem('username', 'StreamerPro');

        vi.spyOn(authApi, 'logoutApi').mockResolvedValueOnce({});

        const { logout, user, isAuthenticated } = useAuth();

        await logout();

        expect(user.value).toBeNull();
        expect(isAuthenticated.value).toBe(false);
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
    });
});

