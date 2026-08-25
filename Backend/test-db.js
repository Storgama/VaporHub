import pg from 'pg';
import dotenv from 'dotenv';

// Charge les variables du fichier .env
dotenv.config();

const { Client } = pg;

// Récupère l'URL de connexion depuis le fichier .env
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('🔄 Connexion à Supabase en cours...');
    await client.connect();
    
    // Requête de test simple : demande la version de PostgreSQL et l'heure de la BDD
    const res = await client.query('SELECT version(), NOW();');
    
    console.log('✅ Connexion réussie à Supabase !');
    console.log('🕒 Heure du serveur BDD :', res.rows[0].now);
    console.log('🐘 Version PostgreSQL :', res.rows[0].version.split(' ')[0] + ' ' + res.rows[0].version.split(' ')[1]);
  } catch (err) {
    console.error('❌ Erreur de connexion à la BDD :');
    console.error(err.message);
  } finally {
    await client.end();
  }
}

testConnection();