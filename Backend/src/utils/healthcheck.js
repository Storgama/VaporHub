import { check, timestamp } from 'drizzle-orm/gel-core';
import { db } from '../db/initBdd.js';
import { sql } from 'drizzle-orm';

/**
 * Exécute une promesse avec un délai d'expiration (timeout)
 */
function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de connexion (${ms}ms)`)), ms)
    );
    return Promise.race([promise, timeout]);
}


/**
 * Exécute l'ensemble des tests pur vérifier la "santé" du système
 */
export async function runHealthCheck() {
    const results = {
        database: { status: 'DOWN', latencyMs: 0, error: null },
    };

    let globalStatus = 'ok';

    // --- 1. Test BDD (Drizzle / PostgreSQL) ---
    const starDB = Date.now();
    try {
        // Exécute une requête SQL ultra légère (SELECT 1)
        await withTimeout(db.execute(sql`SELECT 1`), 3000);
        results.database.status = 'UP';
        results.database.latencyMs = Date.now() - starDB;
    } catch(err) {
        console.error('⚠️ ERREUR BRUTE BDD :', err);
        globalStatus = 'KO';
        results.database.error = err?.message || 'Erreur de connexion BDD inconnue';
    }

    
    return {
        status: globalStatus,
        timestamp: new Date().toISOString(),
        checks: results,
    }
}