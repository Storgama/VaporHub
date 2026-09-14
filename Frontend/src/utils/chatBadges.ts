import type { ResolvedBadge } from '../types/chat';

export const DEFAULT_BADGES: Record<string, ResolvedBadge> = {
    broadcaster: {
        label: 'Diffuseur',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1'
    },
    moderator: {
        label: 'Modérateur',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1'
    },
    vip: {
        label: 'VIP',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1'
    },
    artist: {
        label: 'Artiste',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/1'
    },
    'artist-badge': {
        label: 'Artiste',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/1'
    },
    founder: {
        label: 'Fondateur',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/1'
    },
    subscriber: {
        label: 'Abonné',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1'
    },
    partner: {
        label: 'Partenaire',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/1'
    },
    staff: {
        label: 'Staff',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/d97c37bd-a6f5-4c38-8f57-4e4bef88af34/1'
    },
    premium: {
        label: 'Prime Gaming',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/1'
    },
    zevent: {
        label: 'ZEvent',
        imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1'
    }
};

/**
 * Résout un identifiant de badge en label et URL d'icône.
 * Priorise les badges personnalisés de la chaîne s'ils sont fournis.
 */
export function resolveBadge(
    badgeId: string,
    channelBadges?: Record<string, unknown>
): ResolvedBadge | null {
    if (!badgeId) return null;

    const baseId = badgeId.split('/')[0];

    // Vérifier si un badge personnalisé existe pour cette clé
    if (channelBadges) {
        const raw = channelBadges[badgeId] || channelBadges[baseId];
        if (raw && typeof raw === 'object') {
            const item = raw as Record<string, unknown>;
            const label = (item.label as string) || (item.title as string) || baseId;
            const imageUrl =
                (item.imageUrl as string) ||
                (item.image_url as string) ||
                (item.image_url_1x as string);

            if (imageUrl) {
                return { label, imageUrl };
            }
        }
    }

    return DEFAULT_BADGES[badgeId] || DEFAULT_BADGES[baseId] || null;
}
