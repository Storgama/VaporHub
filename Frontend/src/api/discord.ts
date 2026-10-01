import { httpClient } from './client';

export interface DiscordAlertConfigData {
    id?: string;
    userId?: string;
    name?: string;
    guildId: string;
    channelId: string;
    roleMention?: string | null;
    customMessage?: string | null;
    isEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface DiscordBotStatusResponse {
    success: boolean;
    isConnected: boolean;
    botUsername?: string | null;
    lastHeartbeat?: string | null;
}

export interface DiscordAlertConfigResponse {
    success: boolean;
    config?: DiscordAlertConfigData | null;
    configs?: DiscordAlertConfigData[];
    message?: string;
    error?: string;
}

export async function getDiscordBotStatusApi(): Promise<DiscordBotStatusResponse> {
    const res = await httpClient('/discord/status');
    const data = (await res.json()) as DiscordBotStatusResponse;
    if (!res.ok) throw new Error('Impossible de récupérer le statut du bot Discord');
    return data;
}

export async function getDiscordAlertConfigsApi(): Promise<DiscordAlertConfigData[]> {
    const res = await httpClient('/discord/configs');
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible de charger les configurations Discord');
    return data.configs || [];
}

export async function createDiscordAlertConfigApi(
    payload: Omit<DiscordAlertConfigData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<DiscordAlertConfigData> {
    const res = await httpClient('/discord/configs', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible de créer la configuration Discord');
    return data.config as DiscordAlertConfigData;
}

export async function updateDiscordAlertConfigApi(
    id: string,
    payload: Partial<DiscordAlertConfigData>
): Promise<DiscordAlertConfigData> {
    const res = await httpClient(`/discord/configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible de mettre à jour la configuration Discord');
    return data.config as DiscordAlertConfigData;
}

export async function deleteDiscordAlertConfigApi(id: string): Promise<void> {
    const res = await httpClient(`/discord/configs/${id}`, {
        method: 'DELETE'
    });
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible de supprimer la configuration Discord');
}

// Méthodes pour compatibilité
export async function getDiscordAlertConfigApi(): Promise<DiscordAlertConfigData | null> {
    const res = await httpClient('/discord/config');
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible de charger la configuration Discord');
    return data.config ?? null;
}

export async function saveDiscordAlertConfigApi(
    payload: Omit<DiscordAlertConfigData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<DiscordAlertConfigData> {
    const res = await httpClient('/discord/config', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const data = (await res.json()) as DiscordAlertConfigResponse;
    if (!res.ok) throw new Error(data.error || 'Impossible d\'enregistrer la configuration Discord');
    return data.config as DiscordAlertConfigData;
}
