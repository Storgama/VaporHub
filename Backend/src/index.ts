import app from './app.js';
import { runHealthCheck } from './utils/healthcheck.js';

const PORT = Number(process.env.PORT) || 3000;

async function start(): Promise<void> {
    console.log('🔍 Exécution du healthcheck au démarrage...');

    const health = await runHealthCheck();

    if (health.status.toLowerCase() === 'ok') {
        console.log(`✅ BDD connectée (${health.checks.database.latencyMs}ms)`);
    } else {
        console.error('❌ ÉCHEC DU HEALTHCHECK BDD AU DÉMARRAGE !');
        console.error('   Détail :', health.checks.database.error);
    }

    app.listen(PORT, () => {
        console.log(`[Vaporhub Backend] Serveur démarré sur http://localhost:${PORT}`);
    });
}

start();

