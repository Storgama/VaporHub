export interface HeartbeatOptions {
    apiUrl?: string;
    botUsername?: string;
    status?: 'online' | 'offline';
}

export class HeartbeatService {
    private apiUrl: string;
    private intervalTimer: NodeJS.Timeout | null = null;

    constructor(apiUrl?: string) {
        this.apiUrl = apiUrl || process.env.VAPORHUB_API_URL || 'http://localhost:3000/api';
    }

    public async sendHeartbeat(botUsername?: string, status: 'online' | 'offline' = 'online'): Promise<boolean> {
        try {
            const res = await fetch(`${this.apiUrl}/discord/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botUsername, status })
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    public startHeartbeat(botUsername?: string, intervalMs: number = 20_000): void {
        this.stopHeartbeat();
        void this.sendHeartbeat(botUsername, 'online');
        this.intervalTimer = setInterval(() => {
            void this.sendHeartbeat(botUsername, 'online');
        }, intervalMs);
    }

    public stopHeartbeat(botUsername?: string): void {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
        if (botUsername) {
            void this.sendHeartbeat(botUsername, 'offline');
        }
    }
}

