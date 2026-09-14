import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getBotStatus,
    recordHeartbeat,
    resetBotStatus
} from '../../src/services/botStatusService.js';

describe('🤖 Service : botStatusService (Heartbeat du Bot Discord)', () => {
    beforeEach(() => {
        vi.useRealTimers();
        resetBotStatus();
    });

    it('doit indiquer isConnected: false par défaut si aucun heartbeat n\'a été reçu', () => {
        const status = getBotStatus();
        expect(status.isConnected).toBe(false);
        expect(status.botUsername).toBeNull();
    });

    it('doit indiquer isConnected: true suite à la réception d\'un heartbeat récent', () => {
        recordHeartbeat({ botUsername: 'VaporHubBot#1234', status: 'online' });

        const status = getBotStatus();
        expect(status.isConnected).toBe(true);
        expect(status.botUsername).toBe('VaporHubBot#1234');
        expect(status.lastHeartbeat).toBeDefined();
    });

    it('doit indiquer isConnected: false si le dernier heartbeat a expiré (> 45s)', () => {
        vi.useFakeTimers();

        recordHeartbeat({ botUsername: 'VaporHubBot#1234', status: 'online' });
        expect(getBotStatus().isConnected).toBe(true);

        // Avance le temps de 50 secondes
        vi.advanceTimersByTime(50_000);

        const status = getBotStatus();
        expect(status.isConnected).toBe(false);
    });

    it('doit basculer immédiatement en isConnected: false si le statut envoyé est offline', () => {
        recordHeartbeat({ botUsername: 'VaporHubBot#1234', status: 'online' });
        expect(getBotStatus().isConnected).toBe(true);

        recordHeartbeat({ status: 'offline' });
        expect(getBotStatus().isConnected).toBe(false);
    });
});