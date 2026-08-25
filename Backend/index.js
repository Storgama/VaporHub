import app from './src/app.js';

/**
 * tu me dira si tu te souviens plus pour le PORT
 */
const PORT = 3000;

/**
 * en gros je dit a express HEY FRERE ! écoute le port et fait ton taff !
 */
app.listen(PORT, () => {
  console.log(`[Vaporhub Backend] Serveur démarré sur http://localhost:${PORT}`);
});