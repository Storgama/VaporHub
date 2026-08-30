import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './initBdd.js';
import { users, streamSessions, streamMetrics } from './schemas/index.js';

async function seed() {
    // Récupération de l'email depuis l'argument CLI (ex: node src/db/seed.js user@test.com)
    // ou depuis une variable d'environnement SEED_USER_EMAIL
    const targetEmail = process.argv[2] || process.env.SEED_USER_EMAIL;

    let user;

    if (targetEmail) {
        console.log(`🌱 Recherche du compte avec l'email : ${targetEmail}...`);
        const [foundUser] = await db.select().from(users).where(eq(users.email, targetEmail));
        user = foundUser;
    } else {
        console.log('🌱 Aucun email spécifié, sélection du premier utilisateur en BDD...');
        const [firstUser] = await db.select().from(users).limit(1);
        user = firstUser;
    }

    if (!user) {
        console.error('❌ Aucun utilisateur trouvé. Vérifie l\'email ou crée un compte sur VaporHub.');
        process.exit(1);
    }

    console.log(`👤 Compte ciblé : ${user.username} (${user.email} - ${user.id})`);
    console.log('📊 Génération des fausses sessions et courbes de viewers...');

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Définir 2 fausses sessions réalistes
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

        // Générer des points de métrique toutes les 5 minutes
        let currentViewers = fSession.baseViewers;
        const pointsCount = (fSession.durationHours * 60) / 5;

        for (let i = 0; i < pointsCount; i++) {
            const pointTime = new Date(fSession.startedAt.getTime() + i * 5 * 60 * 1000);
            
            const randomDelta = Math.floor(Math.random() * 9) - 4;
            currentViewers = Math.max(10, Math.min(fSession.peak, currentViewers + randomDelta));

            await db.insert(streamMetrics).values({
                sessionId: session.id,
                viewerCount: currentViewers,
                timestamp: pointTime
            });
        }
    }

    console.log('✅ Fausses données générées avec succès !');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Erreur seed :', err);
    process.exit(1);
});
