import { describe, it, expect } from 'vitest';
import { resolveBadge, DEFAULT_BADGES } from '../../src/utils/chatBadges.js';

describe('🛡️ Utilitaire : chatBadges (Badges de rôle & événementiels)', () => {

    it('doit résoudre le badge Modérateur avec son label et icône officielle', () => {
        const badge = resolveBadge('moderator');
        expect(badge).toBeDefined();
        expect(badge?.label).toBe('Modérateur');
        expect(badge?.imageUrl).toContain('static-cdn.jtvnw.net');
    });

    it('doit résoudre le badge VIP', () => {
        const badge = resolveBadge('vip');
        expect(badge).toBeDefined();
        expect(badge?.label).toBe('VIP');
    });

    it('doit résoudre le badge Artiste', () => {
        const badge = resolveBadge('artist');
        expect(badge).toBeDefined();
        expect(badge?.label).toBe('Artiste');
    });

    it('doit résoudre le badge ZEvent', () => {
        const badge = resolveBadge('zevent');
        expect(badge).toBeDefined();
        expect(badge?.label).toBe('ZEvent');
    });

    it('doit prioriser un badge personnalisé de chaîne si fourni', () => {
        const channelBadges = {
            subscriber: {
                label: 'Abonné 12 mois',
                imageUrl: 'https://cdn.twitch.test/sub12.png'
            }
        };

        const badge = resolveBadge('subscriber', channelBadges);
        expect(badge).toEqual({
            label: 'Abonné 12 mois',
            imageUrl: 'https://cdn.twitch.test/sub12.png'
        });
    });

    it('doit renvoyer null si le badge est inconnu', () => {
        const badge = resolveBadge('badge_totalement_inconnu');
        expect(badge).toBeNull();
    });
});