import { db } from '../db/initBdd.js';
import { sql } from 'drizzle-orm';

export interface DatabaseHealth {
    status: 'UP' | 'DOWN';
    latencyMs: number;
    error: string | null;
}

export interface HealthCheckChecks {
    database: DatabaseHealth;
    [key: string]: DatabaseHealth;
}

export interface HealthCheckResponse {
    status: 'ok' | 'KO';
    timestamp: string;
    checks: HealthCheckChecks;
}

/**
 * Exécute une promesse avec un délai d'expiration (timeout)
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de connexion (${ms}ms)`)), ms)
    );
    return Promise.race([promise, timeout]);
}

/**
 * Exécute l'ensemble des tests pour vérifier la santé du système
 */
export async function runHealthCheck(): Promise<HealthCheckResponse> {
    const results: HealthCheckChecks = {
        database: { status: 'DOWN', latencyMs: 0, error: null },
    };

    let globalStatus: 'ok' | 'KO' = 'ok';

    // --- 1. Test BDD (Drizzle / PostgreSQL) ---
    const startDB = Date.now();
    try {
        // Exécute une requête SQL ultra légère (SELECT 1)
        await withTimeout(db.execute(sql`SELECT 1`), 3000);
        results.database.status = 'UP';
        results.database.latencyMs = Date.now() - startDB;
    } catch (err: unknown) {
        console.error('⚠️ ERREUR BRUTE BDD :', err);
        globalStatus = 'KO';
        const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion BDD inconnue';
        results.database.error = errorMessage;
    }

    return {
        status: globalStatus,
        timestamp: new Date().toISOString(),
        checks: results,
    };
}

