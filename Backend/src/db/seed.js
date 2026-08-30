import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './initBdd.js';
import { users, streamSessions, streamMetrics } from './schemas/index.js';

async function seed() {
    console.log('🌱 Recherche de ton compte...');

    // 1. Récupérer précisément ton compte par ton email
    const [user] = await db.select().from(users).where(eq(users.email, 'pominuseventguard@gmail.com'));

    if (!user) {
        console.error('❌ Aucun compte trouvé avec l\'email pominuseventguard@gmail.com.');
        process.exit(1);
    }

    console.log(`👤 Compte trouvé : ${user.username} (${user.id})`);
    console.log('📊 Génération des fausses sessions et courbes de viewers...');

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 2. Définir 2 fausses sessions réalistes
    const fakeSessions = [
        {
            title: '🔴 Soirée Tryhard & Ranked Valorant !',
            gameName: 'Valorant',
            durationHours: 3,
            baseViewers: 22,
            peak: 64,
            startedAt: new Date(now - 24 * oneHour) // Hier
        },
        {
            title: '☕ Chill, Discussion & Découverte Jeu Indé',
            gameName: 'Just Chatting',
            durationHours: 2,
            baseViewers: 16,
            peak: 38,
            startedAt: new Date(now - 48 * oneHour) // Avant-hier
        }
    ];

    for (const fSession of fakeSessions) {
        const endedAt = new Date(fSession.startedAt.getTime() + fSession.durationHours * oneHour);

        const [session] = await db.insert(streamSessions).values({
            userId: user.id,
            provider: 'twitch',
            providerStreamId: 'fake_' + Math.random().toString(36).substring(7),
            title: fSession.title,
            gameName: fSession.gameName,
            peakViewers: fSession.peak,
            startedAt: fSession.startedAt,
            endedAt: endedAt
        }).returning();

        // 3. Générer des points de métrique toutes les 5 minutes
        let currentViewers = fSession.baseViewers;
        const pointsCount = (fSession.durationHours * 60) / 5;

        for (let i = 0; i < pointsCount; i++) {
            const pointTime = new Date(fSession.startedAt.getTime() + i * 5 * 60 * 1000);
            
            // Simulation d'une variation naturelle des viewers
            const randomDelta = Math.floor(Math.random() * 9) - 4; // -4 à +4
            currentViewers = Math.max(10, Math.min(fSession.peak, currentViewers + randomDelta));

            await db.insert(streamMetrics).values({
                sessionId: session.id,
                viewerCount: currentViewers,
                timestamp: pointTime
            });
        }
    }

    console.log('✅ Fausses données générées avec succès pour ton compte !');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Erreur seed :', err);
    process.exit(1);
});

