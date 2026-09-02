import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

describe('🛡️ Middleware : errorHandler (errorHandler.js)', () => {
    it('doit capturer une erreur standard et renvoyer un statut 500', () => {
        delete process.env.NODE_ENV;
        const error = new Error('Erreur de test interne');
        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        vi.spyOn(console, 'error').mockImplementation(() => {});

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Erreur de test interne',
                status: 500
            }
        });
    });

    it('doit respecter le statut personnalisé s\'il est présent sur l\'erreur', () => {
        const error = new Error('Non autorisé');
        error.status = 403;

        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        vi.spyOn(console, 'error').mockImplementation(() => {});

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Non autorisé',
                status: 403
            }
        });
    });

    it('doit masquer les détails de l\'erreur 500 en environnement de production (Points 79 & 80)', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Détail secret de la base de données qui ne doit pas fuiter');
        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        vi.spyOn(console, 'error').mockImplementation(() => {});

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Erreur interne du serveur',
                status: 500
            }
        });
        delete process.env.NODE_ENV;
    });
});
