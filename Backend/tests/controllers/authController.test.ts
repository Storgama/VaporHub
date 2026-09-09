//import pour ecrire les tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

//import de ce qu'on as besoin pour faire les tests (code métier)
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

describe('Controller: authController', () => {
    //1. Déclaration des variable avec type stricts
    let req: Partial<Request>
    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
    let next: NextFunction;

    //2 le init avant chaque test
    beforeEach(() => {
        vi.clearAllMocks();

        process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_123';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_456';

        req = { 
            body: {} 
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    })

    // --- Helpers de mock BDD réutilisables ---
    // Simule db.select().from().where() -> renvoie un tableau de résultats
    function mockSelectReturn<T>(data: T[]) {
        vi.mocked(db.select).mockReturnValueOnce({
            from: vi.fn().mockReturnValueOnce({
                where: vi.fn().mockResolvedValueOnce(data)
            })
        } as unknown as ReturnType<typeof db.select>);
    }
    // Simule db.insert().values().returning() -> renvoie les enregistrements créés
    function mockInsertReturning<T>(data: T[]) {
        vi.mocked(db.insert).mockReturnValueOnce({
            values: vi.fn().mockReturnValueOnce({
                returning: vi.fn().mockResolvedValueOnce(data)
            })
        } as unknown as ReturnType<typeof db.insert>);
    }
    // Simule db.insert().values() sans returning (ex: refresh token)
    function mockInsertResolve() {
        vi.mocked(db.insert).mockReturnValueOnce({
            values: vi.fn().mockResolvedValueOnce({})
        } as unknown as ReturnType<typeof db.insert>);
    }
    // Simule db.delete().where()
    function mockDeleteResolve() {
        vi.mocked(db.delete).mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce({})
        } as unknown as ReturnType<typeof db.delete>);
    }

    describe('Inscription: register()', () => {
        it('Renvoi 400 si des champs obligatoire sont manquant', async () => {
            //données imcomplète
            req.body = { email: 'test@test.com', username: 'Test'};

            await register(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
        })

        it('Renvoi 400 si MDP trop court', async () => {
            //données imcomplète
            req.body = { email: 'test@test.com', username: 'Test', password: '123'};

            await register(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
        })

        it('Renvoie 409 si l\'email existe déjà en base', async () => {
            // 1. Données envoyées avec un email déjà pris
            req.body = {
                email: 'existant@test.com',
                username: 'TestUser',
                password: 'Password123!'
            };

            // 2. Simulation de la chaîne Drizzle : select().from().where()
            // On renvoie un tableau contenant un utilisateur existant
            mockSelectReturn([{ id: 'uuid-123', email: 'existant@test.com' }]);

            // 3. Exécution du contrôleur
            await register(req as Request, res as unknown as Response, next);

            // 4. Assertions attendues : statut 409 et message d'erreur
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Cet email est déjà utilisé'
            });
        });

        it('doit créer l\'utilisateur, générer les tokens JWT et renvoyer 201 en cas de succès', async () => {
            req.body = {
                email: 'nouveau@test.com',
                username: 'Nouveau',
                password: 'Password123!'
            };

            const createdUser = {
                id: 'uuid_123',
                email: 'nouveau@test.com',
                username: 'Nouveau',
                role: 'streamer'
            };

            //2. Configuration BDD en 3 lignes expressives :
            mockSelectReturn([]);             // 1. Email non trouvé
            mockInsertReturning([createdUser]); // 2. Création de l'utilisateur
            mockInsertResolve();               // 3. Stockage du Refresh Token

            //3. on exec register
            await register(req as Request, res as unknown as Response, next);

            //4 on regarde que tout est bon
            // 4. Assertions attendues
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Utilisateur créé avec succès',
                user: createdUser,
                accessToken: expect.any(String),
                refreshToken: expect.any(String)
            }));
        });
    });

    describe('Connexion: login()', () => {
        it('Renvoi 400 si des champs obligatoire sont manquant', async () => {
            //données imcomplète
            req.body = { email: 'test@test.com'};

            await login(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
        });

        it('Renvoi 401 si le compte n\'existe pas', async () => {
            req.body = { email: 'jexistepas@test.com', password: 'Password123!'};

            mockSelectReturn([]);

            await login(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Identifiants invalides'
            }));
        });

         it('Renvoi 401 si le mot de passe est incorrect', async () => {
            req.body = { email: 'coucou@test.com', password: 'MauvaisPassword!' };

            const userInDb = {
                id: 'uuid_123',
                email: 'coucou@test.com',
                username: 'coucou',
                role: 'streamer',
                password: 'hashed_password'
            };

            mockSelectReturn([userInDb]);

            // On simule l'échec de la comparaison Argon2id
            vi.spyOn(passwordUtils, 'verifyPassword').mockResolvedValueOnce(false);

            await login(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Identifiants invalides'
            });
        });

        it('connect l\'utilisateur', async () => {
            req.body = { email: 'coucou@test.com', password: 'BonPassword123!'};

            const UserInDb = {
                id: 'uuid_123',
                email: 'coucou@test.com',
                username: 'coucou',
                role: 'streamer',
                password: 'hashed_password'
            };

            mockSelectReturn([UserInDb]);
            // On valide le mot de passe
            vi.spyOn(passwordUtils, 'verifyPassword').mockResolvedValueOnce(true);
            // On mocke la sauvegarde du refresh token
            mockInsertResolve();

            await login(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Connexion réussie',
                accessToken: expect.any(String),
                refreshToken: expect.any(String),
                user: expect.objectContaining({
                    id: 'uuid_123',
                    email: 'coucou@test.com',
                    username: 'coucou',
                    role: 'streamer'
                })
            }));
        });
    });

    describe('Refresh Token: refresh()', () => {
        it('RefreshToken absent', async () => {
            req.body = {};

            await refresh(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Refresh Token manquant' 
            }));
        });

        it('Token Invalid ou expirer', async () => {
            req.body = {
                refreshToken: 'TokenInvalid'
            }

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockImplementationOnce(() => {
                throw new Error('Invalid or expired token');
            });

            await refresh(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Refresh Token invalide ou expiré' 
            }));
        });

        it('Token valide mais révoqué', async () => {
            req.body = {
                refreshToken: 'TokenRevoqué'
            }

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValueOnce(
                { userId: 'user_1' } as any
            )
            mockSelectReturn([]);

            await refresh(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Session révoquée ou inexistante' 
            }));
        });

        it('Token Ok tout va bien', async () => {
            req.body = {
                refreshToken: 'TokenRevoqué'
            }

            vi.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValueOnce(
                { userId: 'user_1' } as unknown as ReturnType<typeof jwtUtils.verifyRefreshToken>
            )

            mockSelectReturn([{ token: 'valid_refresh_token', userId: 'user_1' }]);
            mockSelectReturn([{ id: 'user_1', role: 'streamer' }]);

            await refresh(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                accessToken: expect.any(String)
            }));
        });
    })


    describe('Déconnexion: logout()', () => {
        it('doit supprimer le Refresh Token de la BDD et confirmer la déconnexion', async () => {
            req.body = { refreshToken: 'token_a_supprimer' };

            mockDeleteResolve();

            await logout(req as Request, res as unknown as Response, next);

            expect(res.json).toHaveBeenCalledWith({ message: 'Déconnexion réussie' });
        });
    });
})