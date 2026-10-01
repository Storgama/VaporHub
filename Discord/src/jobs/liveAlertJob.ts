import { EmbedBuilder } from 'discord.js';

export interface LiveStreamData {
    streamId: string;
    streamerName: string;
    title: string;
    gameName: string;
    streamUrl: string;
    avatarUrl: string;
    thumbnailUrl: string;
    viewerCount: number;
}

export interface AlertConfig {
    channelId: string;
    roleMention?: string;
    customText?: string;
}

export interface SendAlertResult {
    sent: boolean;
    messageId?: string;
    reason?: 'ALREADY_NOTIFIED' | 'CHANNEL_NOT_FOUND' | 'ERROR';
}

export interface SendableChannel {
    id: string;
    send: (options: { content: string; embeds: EmbedBuilder[] }) => Promise<{ id: string }>;
}

export class LiveAlertJob {
    private notifiedStreams: Set<string> = new Set();

    /**
     * Formate le message textuel en remplaçant les variables dynamiques.
     */
    public formatMessage(
        template: string | undefined,
        stream: LiveStreamData,
        roleMention?: string
    ): string {
        const raw = template || '{role} {streamer} est en direct sur {game} !';
        const role = roleMention || '';

        return raw
            .replace(/{role}/g, role)
            .replace(/{streamer}/g, stream.streamerName)
            .replace(/{game}/g, stream.gameName)
            .replace(/{title}/g, stream.title)
            .replace(/{viewers}/g, stream.viewerCount.toString())
            .replace(/{url}/g, stream.streamUrl);
    }

    /**
     * Construit l'Embed Discord officiel avec le thème Twitch et les métadonnées de stream.
     */
    public buildEmbed(stream: LiveStreamData): EmbedBuilder {
        const formattedThumbnail = stream.thumbnailUrl
            .replace('{width}', '1280')
            .replace('{height}', '720');

        return new EmbedBuilder()
            .setTitle(stream.title)
            .setURL(stream.streamUrl)
            .setColor(0x9146FF)
            .setAuthor({
                name: `${stream.streamerName} est en direct !`,
                iconURL: stream.avatarUrl
            })
            .setImage(formattedThumbnail)
            .addFields(
                { name: '🎮 Jeu / Catégorie', value: stream.gameName || 'Inconnu', inline: true }
            );
    }

    /**
     * Envoie l'alerte dans le salon Discord cible avec protection anti-doublon.
     */
    public async sendAlert(
        channel: SendableChannel,
        stream: LiveStreamData,
        config: AlertConfig
    ): Promise<SendAlertResult> {
        if (this.notifiedStreams.has(stream.streamId)) {
            return {
                sent: false,
                reason: 'ALREADY_NOTIFIED'
            };
        }

        const content = this.formatMessage(config.customText, stream, config.roleMention);
        const embed = this.buildEmbed(stream);

        const sentMessage = await channel.send({
            content,
            embeds: [embed]
        });

        this.notifiedStreams.add(stream.streamId);

        return {
            sent: true,
            messageId: sentMessage.id
        };
    }

    /**
     * Réinitialise le statut d'un stream lorsqu'il passe hors-ligne.
     */
    public clearStreamSession(streamId: string): void {
        this.notifiedStreams.delete(streamId);
    }
}

