import type { AlertConfig } from '../jobs/liveAlertJob';

export interface RemoteDiscordAlertConfig {
    guildId: string;
    channelId: string;
    roleMention?: string | null;
    customMessage?: string | null;
    isEnabled: boolean;
}

export class DiscordConfigService {
    private apiUrl: string;

    constructor(apiUrl?: string) {
        this.apiUrl = apiUrl || process.env.VAPORHUB_API_URL || 'http://localhost:3000/api';
    }

    /**
     * Transforme la configuration issue de l'API / BDD vers le format AlertConfig consommable par LiveAlertJob.
     */
    public toAlertConfig(remote: RemoteDiscordAlertConfig): AlertConfig | null {
        if (!remote.isEnabled) return null;

        return {
            channelId: remote.channelId,
            roleMention: remote.roleMention || undefined,
            customText: remote.customMessage || undefined
        };
    }

    /**
     * Récupère la configuration d'alerte depuis l'API VaporHub.
     */
    public async fetchAlertConfig(apiToken?: string): Promise<AlertConfig | null> {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (apiToken) {
                headers['Authorization'] = `Bearer ${apiToken}`;
            }

            const res = await fetch(`${this.apiUrl}/discord/config`, { headers });
            if (!res.ok) return null;

            const data = (await res.json()) as { config?: RemoteDiscordAlertConfig | null };
            if (!data.config) return null;

            return this.toAlertConfig(data.config);
        } catch {
            return null;
        }
    }
}

