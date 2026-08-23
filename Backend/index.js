import app from './src/app.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`[Vaporhub Backend] Serveur démarré sur http://localhost:${PORT}`);
});