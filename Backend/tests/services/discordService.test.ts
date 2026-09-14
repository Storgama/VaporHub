import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    mockSelectReturn, 
    mockInsertReturning, 
    mockUpdateResolve,
    mockDeleteResolve
} from '../helpers/dbMock.js';
import {
    getAlertConfigs,
    createAlertConfig,
    updateAlertConfig,
    deleteAlertConfig
} from '../../src/services/discordService.js';

describe('🤖 Service : discordService (Multi-Alertes 1:N)', () => {
    const userId = 'user-uuid-123';
    const alertId = 'alert-uuid-456';

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getAlertConfigs', () => {
        it('doit renvoyer la liste de toutes les alertes de l\'utilisateur', async () => {
            const mockConfigs = [
                { id: '1', userId, name: 'Alerte Serveur 1', guildId: '123456789012345678', channelId: '987654321098765432', isEnabled: true },
                { id: '2', userId, name: 'Alerte Serveur 2', guildId: '223456789012345678', channelId: '887654321098765432', isEnabled: false }
            ];
            mockSelectReturn(mockConfigs);

            const result = await getAlertConfigs(userId);

            expect(result).toEqual(mockConfigs);
        });

        it('doit renvoyer un tableau vide si aucune alerte n\'est configurée', async () => {
            mockSelectReturn([]);
            const result = await getAlertConfigs(userId);
            expect(result).toEqual([]);
        });
    });

    describe('createAlertConfig', () => {
        it('doit insérer et renvoyer une nouvelle alerte avec son nom personnalisé', async () => {
            const inputData = {
                name: 'Alerte Communautaire',
                guildId: '123456789012345678',
                channelId: '987654321098765432',
                roleMention: '@everyone',
                customMessage: 'Live ON !',
                isEnabled: true
            };

            const created = { id: alertId, userId, ...inputData };
            mockInsertReturning([created]);

            const result = await createAlertConfig(userId, inputData);

            expect(result).toEqual(created);
        });
    });

    describe('updateAlertConfig', () => {
        it('doit mettre à jour l\'alerte ciblée appartenant à l\'utilisateur', async () => {
            const existing = { id: alertId, userId, name: 'Ancien Nom', guildId: '123456789012345678', channelId: '987654321098765432' };
            const updated = { ...existing, name: 'Nouveau Nom', isEnabled: false };

            // 1. Vérifie existence & ownership
            mockSelectReturn([existing]);
            // 2. Update returning
            mockSelectReturn([updated]); // ou mockUpdateReturning

            const result = await updateAlertConfig(userId, alertId, { name: 'Nouveau Nom', isEnabled: false });

            expect(result).toEqual(updated);
        });

        it('doit renvoyer null si l\'alerte n\'existe pas ou n\'appartient pas à l\'utilisateur', async () => {
            mockSelectReturn([]); // Introuvable
            const result = await updateAlertConfig(userId, 'unknown-id', { name: 'Test' });
            expect(result).toBeNull();
        });
    });

    describe('deleteAlertConfig', () => {
        it('doit supprimer l\'alerte si elle appartient à l\'utilisateur', async () => {
            const existing = { id: alertId, userId };
            mockSelectReturn([existing]);
            mockDeleteResolve();

            const result = await deleteAlertConfig(userId, alertId);

            expect(result).toBe(true);
        });

        it('doit renvoyer false si l\'alerte est introuvable ou n\'appartient pas à l\'utilisateur', async () => {
            mockSelectReturn([]);
            const result = await deleteAlertConfig(userId, 'wrong-alert');
            expect(result).toBe(false);
        });
    });
});