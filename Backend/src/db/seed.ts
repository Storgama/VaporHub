import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './initBdd.js';
import { users, streamSessions, streamMetrics, type User, type NewStreamMetric } from './schemas/index.js';

interface GameSeed {
    name: string;
    titles: string[];
}

/**
 * Script de Seeding Réaliste : 2 Ans d'Historique de Stream (3 lives par semaine = ~312 streams)
 */
async function seedTwoYears(): Promise<void> {
    const targetEmail = process.argv[2] || process.env.SEED_USER_EMAIL;
    let user: User | undefined;

    if (targetEmail) {
        console.log(`🌱 Recherche du compte : ${targetEmail}...`);
        const [foundUser] = await db.select().from(users).where(eq(users.email, targetEmail));
        user = foundUser;
    } else {
        console.log('🌱 Recherche du premier compte en BDD...');
        const [firstUser] = await db.select().from(users).limit(1);
        user = firstUser;
    }

    if (!user) {
        console.error('❌ Aucun utilisateur trouvé. Crée un compte ou spécifie un email.');
        process.exit(1);
    }

    console.log(`👤 Génération pour : ${user.username} (${user.email})`);
    console.log('⏳ Génération de 2 ans d\'historique (104 semaines x 3 streams/semaine = 312 streams)...');

    const games: GameSeed[] = [
        { name: 'Valorant', titles: ['Ranked Immortal Road !', 'Duo Q Tryhard', 'Full stack ranked avec la commu'] },
        { name: 'Just Chatting', titles: ['Debrief de la semaine & Chill', 'On discute des drama du web', 'Tier list des pires jeux 2025'] },
        { name: 'GTA RP', titles: ['RP Soirée en ville', 'Braquage de banque et poursuites', 'Nouvelle identité RP'] },
        { name: 'Elden Ring', titles: ['Découverte DLC sans armure', 'Boss fight session tryhard', 'No hit run challenge'] },
        { name: 'League of Legends', titles: ['Placement matches', 'Climb en SoloQ', 'Tilt & Fun en ARAM'] },
        { name: 'Minecraft', titles: ['Survie Hardcore Jour 100', 'Grosse construction de ville', 'Exploration du Nether'] }
    ];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    // 104 semaines (2 ans)
    const totalWeeks = 104;
    const streamScheduleDays = [2, 4, 6]; // Mardi, Jeudi, Samedi

    let streamCount = 0;

    for (let w = totalWeeks; w >= 0; w--) {
        // Facteur de croissance naturelle du streamer sur 2 ans (de 15 viewers à 85+ viewers)
        const progressFactor = (totalWeeks - w) / totalWeeks; // 0.0 -> 1.0
        const baseAudience = Math.round(15 + progressFactor * 60); // 15 -> 75
        const peakAudience = Math.round(baseAudience * (1.3 + Math.random() * 0.4)); // +30% à +70% de pic

        for (const dayOffset of streamScheduleDays) {
            streamCount++;
            const daysAgo = w * 7 + (7 - dayOffset);
            const streamDate = new Date(now - daysAgo * oneDay);
            streamDate.setHours(19 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0, 0); // Entre 19h et 21h

            const durationHours = 2.5 + Math.round(Math.random() * 20) / 10; // Entre 2.5h et 4.5h
            const endedAt = new Date(streamDate.getTime() + durationHours * oneHour);

            const randomGame = games[Math.floor(Math.random() * games.length)];
            const randomTitle = randomGame.titles[Math.floor(Math.random() * randomGame.titles.length)];

            // Insertion session
            const [createdSession] = await db.insert(streamSessions).values({
                userId: user.id,
                provider: 'twitch',
                providerStreamId: `stream_2y_${w}_${dayOffset}`,
                title: randomTitle,
                gameName: randomGame.name,
                peakViewers: peakAudience,
                startedAt: streamDate,
                endedAt: endedAt
            }).returning();

            // Générer les points métriques (toutes les 15 minutes)
            const metricIntervalMinutes = 15;
            const pointsCount = Math.floor((durationHours * 60) / metricIntervalMinutes);
            let currentViewers = Math.round(baseAudience * 0.8);

            const sessionMetrics: NewStreamMetric[] = [];
            for (let p = 0; p < pointsCount; p++) {
                const pointTime = new Date(streamDate.getTime() + p * metricIntervalMinutes * 60 * 1000);

                // Fluctuation d'audience
                const delta = Math.floor(Math.random() * 9) - 4;
                currentViewers = Math.max(8, Math.min(peakAudience, currentViewers + delta));

                sessionMetrics.push({
                    sessionId: createdSession.id,
                    viewerCount: currentViewers,
                    timestamp: pointTime
                });
            }

            // Batch insert des métriques de la session
            if (sessionMetrics.length > 0) {
                await db.insert(streamMetrics).values(sessionMetrics);
            }
        }
    }

    console.log(`🎉 SUCCÈS : ${streamCount} sessions de stream et des milliers de points métriques insérés sur 2 ans !`);
    process.exit(0);
}

seedTwoYears().catch((err: unknown) => {
    console.error('❌ Erreur seeding 2 ans :', err);
    process.exit(1);
});

