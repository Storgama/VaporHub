import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { errorHandler } from '../../src/middlewares/errorHandler.js';
import express from 'express';
import request from 'supertest';

//err, req, res, next
describe('🛡️ Middleware : errorHandler', () => {

    interface AppError extends Error {
        status?: number;
        statusCode?: number;
    }

    let err: AppError;
    let req: Partial<Request>;
    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
    let next: NextFunction;

    // 2. Initialisation propre avant chaque test
    beforeEach(() => {
        vi.clearAllMocks();
        // Évite de polluer la console avec les stack traces et permet de vérifier le log
        vi.spyOn(console, 'error').mockImplementation(() => {});
        req = {};
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    it('doit être déclenché automatiquement par Express quelle que soit la route appelée qui lève une erreur', async () => {
        // 1. Création d'une mini-app Express pour tester le cycle de vie réel
        const testApp = express();
        
        // Une route quelconque qui crashe
        testApp.get('/api/n_importe_quelle_route', () => {
            throw new Error('Crash sauvage dans un contrôleur');
        });
        
        // Branchement de notre ErrorHandler
        testApp.use(errorHandler);
        
        // 2. Appel HTTP réel via Supertest
        const response = await request(testApp).get('/api/n_importe_quelle_route');
        
        // 3. Vérification qu'Express a bien fait atterrir la requête dans errorHandler
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.message).toBe('Crash sauvage dans un contrôleur');
    });

    it('en PROD : doit générer un errorId hexadécimal, un timestamp ISO et les associer dans les logs et la réponse', () => {
        process.env.NODE_ENV = 'production';
        
        const internalError = new Error('Secret DB crash qui ne doit pas fuiter');
        errorHandler(internalError, req as Request, res as unknown as Response, next);
        // 1. Statut 500
        expect(res.status).toHaveBeenCalledWith(500);
        // 2. Vérification de la réponse client sécurisée avec errorId et timestamp
        expect(res.json).toHaveBeenCalledWith({
            error: expect.objectContaining({
                message: 'Erreur interne du serveur',
                status: 500,
                // Doit être une chaîne hexadécimale (ex: 8 caractères hex)
                errorId: expect.stringMatching(/^[a-f0-9]{8,}$/i),
                // Doit être un timestamp ISO valide
                timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            })
        });
        // 3. Récupération de l'errorId généré pour vérifier sa présence dans les logs serveur
        const jsonCall = res.json.mock.calls[0][0];
        const generatedErrorId = jsonCall.error.errorId;
        // Le support doit impérativement retrouver l'errorId et la date dans console.error
        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
            error: '[Error Handler]:',
            errorId: generatedErrorId,
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            stack: expect.anything()
        }));
        delete process.env.NODE_ENV;
    });

    it('en PROD : doit conserver le message métier et le statut HTTP pour une erreur contrôlée (ex: 403) avec la traçabilité', () => {
        process.env.NODE_ENV = 'production';
        // 1. Erreur métier contrôlée (ex: levée dans un contrôleur ou middleware)

        const businessError = new Error('Accès interdit : fonctionnalités réservées aux partenaires') as AppError;
        businessError.status = 403;

        // 2. Exécution du middleware
        errorHandler(businessError, req as Request, res as unknown as Response, next);
        
        // 3. Le statut 403 doit être respecté
        expect(res.status).toHaveBeenCalledWith(403);
        
        // 4. Le message voulu doit être AFFICHÉ au client, accompagné de l'errorId et du timestamp
        expect(res.json).toHaveBeenCalledWith({
            error: expect.objectContaining({
                message: 'Accès interdit : fonctionnalités réservées aux partenaires',
                status: 403,
                errorId: expect.stringMatching(/^[a-f0-9]{8,}$/i),
                timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            })
        });
        
        // 5. La trace doit également être loguée pour le support
        const jsonCall = res.json.mock.calls[0][0];
        const generatedErrorId = jsonCall.error.errorId;
        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
            error: '[Error Handler]:',
            errorId: generatedErrorId,
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            stack: expect.anything()
        }));

        delete process.env.NODE_ENV;
    });

    it('en DEV : doit capturer une erreur métier (ex: 403) et renvoyer la stack trace dans la réponse JSON pour le débug', () => {
        delete process.env.NODE_ENV; // Mode développement
        
        const businessError = new Error('Accès interdit : fonctionnalités réservées aux partenaires') as AppError;
        businessError.status = 403;
        
        errorHandler(businessError, req as Request, res as unknown as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        
         // 👉 La stack trace est renvoyée au client en DEV
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Accès interdit : fonctionnalités réservées aux partenaires',
                status: 403,
                stack: businessError.stack
            }
        });

        // 👉 Et loguée dans la console
        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
            error: '[Error Handler]:',
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            stack: businessError.stack
        }));
    });

    it('en DEV : doit capturer une erreur inopinée (500) et renvoyer la stack trace dans la réponse JSON pour le débug', () => {
        delete process.env.NODE_ENV; // Mode développement par défaut
        
        const unexpectedError = new Error('Crash inattendu du service');
        
        errorHandler(unexpectedError, req as Request, res as unknown as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        
        // 👉 La stack trace est renvoyée au client en DEV
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Crash inattendu du service',
                status: 500,
                stack: unexpectedError.stack
            }
        });

        // 👉 Et loguée dans la console (sans errorId car réservé à la prod)
        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
            error: '[Error Handler]:',
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            stack: unexpectedError.stack
        }));
        
        expect(next).not.toHaveBeenCalled();
    });
})