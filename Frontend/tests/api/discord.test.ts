import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getDiscordAlertConfigsApi,
    createDiscordAlertConfigApi,
    updateDiscordAlertConfigApi,
    deleteDiscordAlertConfigApi
} from '../../src/api/discord';
import * as clientModule from '../../src/api/client';

describe('🤖 API Client : Discord Alerts (discord.ts)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('getDiscordAlertConfigsApi doit renvoyer la liste des configurations d\'alertes', async () => {
        const mockConfigs = [
            { id: '1', name: 'Alerte Principale', guildId: '123456789012345678', channelId: '987654321098765432', isEnabled: true },
            { id: '2', name: 'Alerte Secondaire', guildId: '223456789012345678', channelId: '887654321098765432', isEnabled: false }
        ];

        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, configs: mockConfigs })
        } as unknown as Response);

        const configs = await getDiscordAlertConfigsApi();
        expect(configs).toEqual(mockConfigs);
    });

    it('createDiscordAlertConfigApi doit envoyer un POST /discord/configs et renvoyer la nouvelle alerte', async () => {
        const payload = {
            name: 'Alerte Discord 3',
            guildId: '123456789012345678',
            channelId: '987654321098765432',
            isEnabled: true
        };
        const created = { id: '3', ...payload };

        const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, config: created })
        } as unknown as Response);

        const result = await createDiscordAlertConfigApi(payload);
        expect(result).toEqual(created);
        expect(httpSpy).toHaveBeenCalledWith('/discord/configs', expect.objectContaining({
            method: 'POST'
        }));
    });

    it('updateDiscordAlertConfigApi doit envoyer un PUT /discord/configs/:id', async () => {
        const updated = { id: '1', name: 'Nom Modifié', guildId: '123456789012345678', channelId: '987654321098765432', isEnabled: true };

        const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, config: updated })
        } as unknown as Response);

        const result = await updateDiscordAlertConfigApi('1', { name: 'Nom Modifié' });
        expect(result).toEqual(updated);
        expect(httpSpy).toHaveBeenCalledWith('/discord/configs/1', expect.objectContaining({
            method: 'PUT'
        }));
    });

    it('deleteDiscordAlertConfigApi doit envoyer un DELETE /discord/configs/:id', async () => {
        const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, message: 'Alerte supprimée' })
        } as unknown as Response);

        await deleteDiscordAlertConfigApi('1');
        expect(httpSpy).toHaveBeenCalledWith('/discord/configs/1', expect.objectContaining({
            method: 'DELETE'
        }));
    });
});

