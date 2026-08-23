import express from 'express';

const app = express();
const PORT = 3000;

// Permet à Express de lire le JSON automatiquement
app.use(express.json());

// Route API JSON
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Vaporhub Backend (Express)' });
});

// Route HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Vaporhub</title>
      </head>
      <body>
        <h1>Vaporhub via Express !</h1>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`[Vaporhub] Backend prêt sur http://localhost:${PORT}`);
});