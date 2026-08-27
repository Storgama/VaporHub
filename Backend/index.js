import app from './src/app.js';
import { runHealthCheck } from './src/utils/healthcheck.js';

/**
 * tu me dira si tu te souviens plus pour le PORT
 */
const PORT = process.env.PORT || 3000;

async function start() {
  console.log('🔍 Exécution du healthcheck au démarrage...');

  const health = await runHealthCheck();

  if(health.status?.toLowerCase() === 'ok') {
    console.log(`✅ BDD Supabase connectée (${health.checks.database.latencyMs}ms)`)
  } else {
    console.error('❌ ÉCHEC DU HEALTHCHECK BDD AU DÉMARRAGE !');
    console.error('   Détail :', health.checks.database.error);
  }

  /**
   * en gros je dit a express HEY FRERE ! écoute le port et fait ton taff !
   */
  app.listen(PORT, () => {
    console.log(`[Vaporhub Backend] Serveur démarré sur http://localhost:${PORT}`);
  });
}

start();