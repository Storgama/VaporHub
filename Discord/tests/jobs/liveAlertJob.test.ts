import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockChannel } from '../mocks/mockDiscord';

// Import du futur service que nous allons coder ensemble
import { LiveAlertJob, type LiveStreamData, type AlertConfig } from '../../src/jobs/liveAlertJob';

describe('🔴 Job : LiveAlertJob (Notification de début de Stream)', () => {
    let mockChannel: ReturnType<typeof createMockChannel>;
    let alertJob: LiveAlertJob;

    const mockStream: LiveStreamData = {
        streamId: 'live_stream_999',
        streamerName: 'Pominus',
        title: '[FR] Road to Radiant ! | Drop ON',
        gameName: 'Valorant',
        streamUrl: 'https://twitch.tv/pominus',
        avatarUrl: 'https://static-cdn.jtvnw.net/avatar.png',
        thumbnailUrl: 'https://static-cdn.jtvnw.net/thumb_{width}x{height}.jpg',
        viewerCount: 142
    };

    const mockConfig: AlertConfig = {
        channelId: 'channel_annonces_123',
        roleMention: '@everyone',
        customText: 'Hey {role}, {streamer} vient de lancer son stream sur **{game}** !'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockChannel = createMockChannel('channel_annonces_123');
        alertJob = new LiveAlertJob();
    });

    it('doit formater le message textuel avec les remplacements de variables dynamiques', () => {
        const text = alertJob.formatMessage(mockConfig.customText, mockStream, mockConfig.roleMention);

        expect(text).toContain('@everyone');
        expect(text).toContain('Pominus');
        expect(text).toContain('Valorant');
        expect(text).toBe('Hey @everyone, Pominus vient de lancer son stream sur **Valorant** !');
    });

    it('doit construire un Embed Discord officiel complet aux couleurs de Twitch', () => {
        const embed = alertJob.buildEmbed(mockStream);

        // Données principales de l'embed
        expect(embed.data.title).toBe('[FR] Road to Radiant ! | Drop ON');
        expect(embed.data.url).toBe('https://twitch.tv/pominus');
        expect(embed.data.color).toBe(0x9146FF); // Violet officiel Twitch

        // Auteur et miniature
        expect(embed.data.author?.name).toBe('Pominus est en direct !');
        expect(embed.data.author?.icon_url).toBe('https://static-cdn.jtvnw.net/avatar.png');
        expect(embed.data.image?.url).toContain('thumb_1280x720.jpg'); // Résolution injectée

        // Champ informatif (Jeu uniquement, pas de spectateurs au lancement)
        expect(embed.data.fields).toEqual([
            { name: '🎮 Jeu / Catégorie', value: 'Valorant', inline: true }
        ]);
    });

    it('doit envoyer le message dans le salon Discord et retourner l\'ID du message envoyé', async () => {
        const result = await alertJob.sendAlert(mockChannel as any, mockStream, mockConfig);

        expect(mockChannel.send).toHaveBeenCalledTimes(1);
        const sendPayload = (mockChannel.send as any).mock.calls[0][0];

        expect(sendPayload.content).toContain('@everyone');
        expect(sendPayload.embeds).toHaveLength(1);
        expect(result.sent).toBe(true);
        expect(result.messageId).toBe('msg_sent_123');
    });

    it('ne doit PAS renvoyer d\'alerte si le stream est déjà marqué comme en cours (anti-doublon)', async () => {
        // 1. Premier envoi
        await alertJob.sendAlert(mockChannel as any, mockStream, mockConfig);
        expect(mockChannel.send).toHaveBeenCalledTimes(1);

        // 2. Deuxième tick alors que le stream est toujours en live
        const secondResult = await alertJob.sendAlert(mockChannel as any, mockStream, mockConfig);

        // Ne doit pas avoir envoyé un 2e message
        expect(mockChannel.send).toHaveBeenCalledTimes(1);
        expect(secondResult.sent).toBe(false);
        expect(secondResult.reason).toBe('ALREADY_NOTIFIED');
    });
});