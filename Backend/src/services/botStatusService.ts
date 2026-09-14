export interface BotStatus {
    isConnected: boolean;
    botUsername: string | null;
    lastHeartbeat: string | null;
}

export interface HeartbeatPayload {
    botUsername?: string;
    status?: 'online' | 'offline';
}

const HEARTBEAT_TIMEOUT_MS = 45_000; // 45 secondes de tolérance

let lastHeartbeatDate: Date | null = null;
let currentBotUsername: string | null = null;
let currentStatus: 'online' | 'offline' = 'offline';

/**
 * Enregistre un battement de cœur provenant du bot Discord
 */
export function recordHeartbeat(payload: HeartbeatPayload): void {
    if (payload.status === 'offline') {
        currentStatus = 'offline';
        lastHeartbeatDate = null;
        return;
    }

    currentStatus = 'online';
    lastHeartbeatDate = new Date();
    if (payload.botUsername) {
        currentBotUsername = payload.botUsername;
    }
}

/**
 * Calcule l'état actuel de connexion du bot
 */
export function getBotStatus(): BotStatus {
    if (!lastHeartbeatDate || currentStatus === 'offline') {
        return {
            isConnected: false,
            botUsername: null,
            lastHeartbeat: lastHeartbeatDate ? lastHeartbeatDate.toISOString() : null
        };
    }

    const elapsed = Date.now() - lastHeartbeatDate.getTime();
    const isConnected = elapsed < HEARTBEAT_TIMEOUT_MS;

    return {
        isConnected,
        botUsername: isConnected ? currentBotUsername : null,
        lastHeartbeat: lastHeartbeatDate.toISOString()
    };
}

/**
 * Réinitialise l'état (utile pour les tests unitaires)
 */
export function resetBotStatus(): void {
    lastHeartbeatDate = null;
    currentBotUsername = null;
    currentStatus = 'offline';
}

