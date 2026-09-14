import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z, type ZodType } from 'zod';

import { validate } from '../../src/middlewares/validate.js';

describe('🛡️ Middleware : validate', () => {

    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const dummySchema = z.object({
        email: z.email({ message: 'Email invalide' }),
        username: z.string().min(3, { message: 'Username trop court' })
    }).strip();

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    // 1. DÉLÉGATION À ERRORHANDLER : Validateur inexistant
    it('doit transmettre une erreur à next() si le validateur/schéma n\'existe pas', async () => {
        // Schéma manquant (null ou undefined)
        const middleware = validate(undefined as unknown as ZodType);
        await middleware(req as Request, res as Response, next);
        // Doit déléguer à errorHandler via next(err) sans répondre directement
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Schéma de validation')
        }));
        expect(res.status).not.toHaveBeenCalled();
    });

    // 2. CAS LIMITE : Requête POST sans body (req.body undefined)
    it('doit rejeter avec un statut 400 si req.body est absent ou indéfini', async () => {
        req.body = undefined;
        const middleware = validate(dummySchema);
        await middleware(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
        expect(next).not.toHaveBeenCalled();
    });

    // 3. VALIDATION REJETÉE : Données invalides par rapport au schéma
    it('doit rejeter avec un statut 400 et le message Zod si les données sont non conformes', async () => {
        req.body = {
            email: 'bad-email',
            username: 'okUser'
        };

        const middleware = validate(dummySchema);

        await middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Email invalide'
        });
        expect(next).not.toHaveBeenCalled();
    });

    // 4. SUCCÈS & ASSAINISSEMENT : Données valides et nettoyage strict
    it('doit assainir req.body (supprimer les champs non autorisés) et appeler next() sans argument', async () => {
        req.body = {
            email: 'valid@vaporhub.test',
            username: 'streamer',
            injectedField: 'hack' // Doit être supprimé par .strip()
        };

        const middleware = validate(dummySchema);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toEqual({
            email: 'valid@vaporhub.test',
            username: 'streamer'
        });
        expect((req.body as Record<string, unknown>).injectedField).toBeUndefined();
    });

    // 6. champ vide
    it('doit rejeter avec un statut 400 si req.body est un objet vide ({})', async () => {
        req.body = {};
        const middleware = validate(dummySchema);
        await middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Des champs sont vides'
        });
        expect(next).not.toHaveBeenCalled();
    });

});

