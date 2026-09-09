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
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([
                        { id: 'uuid-123', email: 'existant@test.com' }
                    ])
                })
            } as unknown as ReturnType<typeof db.select>);

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

            // 1. Mock vérification email : aucun utilisateur trouvé (email disponible)
            vi.mocked(db.select).mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            } as unknown as ReturnType<typeof db.select>);

            const createdUser = {
                id: 'uuid_123',
                email: 'nouveau@test.com',
                username: 'Nouveau',
                role: 'streamer'
            };

            // 2. Mock des 2 insertions successives :
            // 1er insert -> table users (retourne l'utilisateur créé)
            // 2ème insert -> table refreshTokens (persiste le refresh token)
            vi.mocked(db.insert)
                .mockReturnValueOnce({
                    values: vi.fn().mockReturnValueOnce({
                        returning: vi.fn().mockResolvedValueOnce([createdUser])
                    })
                } as unknown as ReturnType<typeof db.insert>)
                .mockReturnValueOnce({
                    values: vi.fn().mockResolvedValueOnce({})
                } as unknown as ReturnType<typeof db.insert>);

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
})