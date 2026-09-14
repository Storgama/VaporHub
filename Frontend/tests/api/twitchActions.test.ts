import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    triggerCommercialApi, 
    startRaidApi, 
    cancelRaidApi, 
    snoozeAdApi 
} from '../../src/api/twitch.js';
import * as clientModule from '../../src/api/client.js';

describe('🎮 API : Actions Rapides Twitch (twitchActions)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('triggerCommercialApi', () => {
        it('doit envoyer une requête POST avec la durée choisie', async () => {
            const mockResponse = { success: true, length: 60, retryAfter: 300 };
            const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as any);

            const res = await triggerCommercialApi(60);

            expect(httpSpy).toHaveBeenCalledWith('/twitch/actions/commercial', {
                method: 'POST',
                body: JSON.stringify({ length: 60 })
            });
            expect(res).toEqual(mockResponse);
        });

        it('doit propager le paramètre ?mock=true en mode simulation', async () => {
            const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, length: 90 })
            } as any);

            await triggerCommercialApi(90, true);

            expect(httpSpy).toHaveBeenCalledWith('/twitch/actions/commercial?mock=true', expect.any(Object));
        });

        it('doit lever une exception si l\'API renvoie une erreur', async () => {
            vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Chaîne non affiliée' })
            } as any);

            await expect(triggerCommercialApi(60)).rejects.toThrow('Chaîne non affiliée');
        });
    });

    describe('startRaidApi', () => {
        it('doit envoyer une requête POST avec le pseudo cible', async () => {
            const mockResponse = { success: true, targetLogin: 'zerator' };
            const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as any);

            const res = await startRaidApi('zerator');

            expect(httpSpy).toHaveBeenCalledWith('/twitch/actions/raid', {
                method: 'POST',
                body: JSON.stringify({ targetLogin: 'zerator' })
            });
            expect(res).toEqual(mockResponse);
        });
    });

    describe('cancelRaidApi', () => {
        it('doit envoyer une requête DELETE pour annuler le raid', async () => {
            const mockResponse = { success: true, canceled: true };
            const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as any);

            const res = await cancelRaidApi();

            expect(httpSpy).toHaveBeenCalledWith('/twitch/actions/raid', {
                method: 'DELETE'
            });
            expect(res).toEqual(mockResponse);
        });
    });

    describe('snoozeAdApi', () => {
        it('doit envoyer une requête POST pour reporter la pub', async () => {
            const mockResponse = { success: true, snoozed: true, nextAdAt: 1234567890 };
            const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as any);

            const res = await snoozeAdApi();

            expect(httpSpy).toHaveBeenCalledWith('/twitch/actions/ads/snooze', {
                method: 'POST'
            });
            expect(res).toEqual(mockResponse);
        });
    });
});