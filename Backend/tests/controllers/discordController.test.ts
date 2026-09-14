import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';
import {
    listAlertConfigs,
    createAlertConfig,
    updateAlertConfig,
    deleteAlertConfig
} from '../../src/controllers/discordController.js';
import * as discordService from '../../src/services/discordService.js';

describe('🎮 Contrôleur : discordController (CRUD Multi-Alertes)', () => {
    let req: Partial<Request> & { user?: { userId: string } };
    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();
        req = {
            user: { userId: 'user-123' },
            body: {},
            params: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    describe('listAlertConfigs', () => {
        it('doit renvoyer 401 si non authentifié', async () => {
            req.user = undefined;
            await listAlertConfigs(req as any, res as any, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('doit renvoyer 200 avec le tableau des configs', async () => {
            const mockList = [{ id: 'a1', name: 'Alerte 1' }];
            vi.spyOn(discordService, 'getAlertConfigs').mockResolvedValueOnce(mockList as any);

            await listAlertConfigs(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({ success: true, configs: mockList });
        });
    });

    describe('createAlertConfig', () => {
        it('doit renvoyer 201 avec la configuration créée', async () => {
            req.body = {
                name: 'Nouvelle alerte',
                guildId: '123456789012345678',
                channelId: '987654321098765432'
            };
            const mockCreated = { id: 'new-id', ...req.body };
            vi.spyOn(discordService, 'createAlertConfig').mockResolvedValueOnce(mockCreated as any);

            await createAlertConfig(req as any, res as any, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, config: mockCreated });
        });
    });

    describe('deleteAlertConfig', () => {
        it('doit renvoyer 404 si l\'alerte est inexistante', async () => {
            req.params = { id: 'fake-id' };
            vi.spyOn(discordService, 'deleteAlertConfig').mockResolvedValueOnce(false);

            await deleteAlertConfig(req as any, res as any, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('doit renvoyer 200 si la suppression a réussi', async () => {
            req.params = { id: 'valid-id' };
            vi.spyOn(discordService, 'deleteAlertConfig').mockResolvedValueOnce(true);

            await deleteAlertConfig(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Alerte supprimée avec succès' });
        });
    });
});