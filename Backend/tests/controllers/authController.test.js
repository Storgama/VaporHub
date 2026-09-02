import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, refresh, logout } from '../../src/controllers/authController.js';
import { db } from '../../src/db/initBdd.js';
import * as passwordUtils from '../../src/utils/password.js';
import * as jwtUtils from '../../src/utils/jwt.js';

// Mock de la base de données
vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

describe('🚪 Controller : Authentification (authController.js)', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_123';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_456';
        process.env.JWT_ACCESS_EXPIRES_IN = '15m';
        process.env.JWT_REFRESH_EXPIRES_IN = '7d';

        req = { body: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    describe('1. Inscription (register)', () => {
        it('doit renvoyer 400 si des champs obligatoires sont manquants', async () => {
            req.body = { email: 'test@test.com', username: 'Test' };

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
        });

        it('doit renvoyer 400 si le mot de passe fait moins de 8 caractères', async () => {
            req.body = { email: 'test@test.com', username: 'Test', password: '123' };

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
        });

        it('doit renvoyer 409 si l\'email existe déjà en base', async () => {
            req.body = { email: 'existant@test.com', username: 'Test', password: 'Password123!' };

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([{ id: '1', email: 'existant@test.com' }])
                })
            });

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ error: 'Cet email est déjà utilisé' });
        });

        it('doit créer l\'utilisateur et renvoyer 201 en cas de succès', async () => {
            req.body = { email: 'nouveau@test.com', username: 'Nouveau', password: 'Password123!' };

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            const createdUser = { id: 'uuid_123', email: 'nouveau@test.com', username: 'Nouveau', role: 'streamer' };
            db.insert.mockReturnValueOnce({
                values: vi.fn().mockReturnValueOnce({
                    returning: vi.fn().mockResolvedValueOnce([createdUser])
                })
            });

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Utilisateur créé avec succès',
                user: createdUser
            });
        });
    });

    describe('2. Connexion (login)', () => {
        it('doit renvoyer 400 si email ou mot de passe manquant', async () => {
            req.body = { email: 'test@test.com' };

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('doit renvoyer 401 si l\'utilisateur n\'existe pas', async () => {
            req.body = { email: 'inconnu@test.com', password: 'Password123!' };

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Identifiants invalides' });
        });

        it('doit renvoyer 401 si le mot de passe est incorrect', async () => {
            req.body = { email: 'user@test.com', password: 'MauvaisPassword' };

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([{ id: '1', email: 'user@test.com', password: 'hashed_password' }])
                })
            });

            vi.spyOn(passwordUtils, 'verifyPassword').mockResolvedValueOnce(false);

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Identifiants invalides' });
        });

        it('doit connecter l\'utilisateur et renvoyer les tokens JWT en cas de succès', async () => {
            req.body = { email: 'user@test.com', password: 'BonPassword123!' };

            const mockUser = { id: 'uuid_1', username: 'TestUser', email: 'user@test.com', role: 'streamer', password: 'hashed_password' };
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([mockUser])
                })
            });

            vi.spyOn(passwordUtils, 'verifyPassword').mockResolvedValueOnce(true);
            db.insert.mockReturnValueOnce({
                values: vi.fn().mockResolvedValueOnce({})
            });

            await login(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Connexion réussie',
                accessToken: expect.any(String),
                refreshToken: expect.any(String),
                user: expect.objectContaining({ email: 'user@test.com' })
            }));
        });
    });

    describe('3. Renouvellement de token (refresh)', () => {
        it('doit renvoyer 400 si refreshToken manquant', async () => {
            req.body = {};

            await refresh(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('doit renvoyer 401 si le refresh token est invalide', async () => {
            req.body = { refreshToken: 'token_corrompu' };

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockImplementationOnce(() => {
                throw new Error('Invalid token');
            });

            await refresh(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('doit renvoyer 403 si le refresh token n\'est plus en BDD (révoqué)', async () => {
            req.body = { refreshToken: 'valid_jwt_string' };

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValueOnce({ userId: 'user_1' });
            
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            await refresh(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Session révoquée ou inexistante' });
        });

        it('doit renvoyer un nouvel Access Token si tout est valide', async () => {
            req.body = { refreshToken: 'valid_jwt_string' };

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValueOnce({ userId: 'user_1' });

            db.select
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockResolvedValueOnce([{ token: 'valid_jwt_string', userId: 'user_1' }])
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockResolvedValueOnce([{ id: 'user_1', role: 'streamer' }])
                    })
                });

            await refresh(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                accessToken: expect.any(String)
            }));
        });
    });

    describe('4. Déconnexion (logout)', () => {
        it('doit supprimer le Refresh Token de la BDD', async () => {
            req.body = { refreshToken: 'token_a_supprimer' };

            db.delete.mockReturnValueOnce({
                where: vi.fn().mockResolvedValueOnce({})
            });

            await logout(req, res, next);

            expect(res.json).toHaveBeenCalledWith({ message: 'Déconnexion réussie' });
        });
    });
});

