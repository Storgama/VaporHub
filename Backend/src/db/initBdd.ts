import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import 'dotenv/config';
import * as schema from './schemas/index.js';

export interface DbConnectionResult {
    success: boolean;
    error?: string;
}

/**
 * Résout la configuration du Pool selon la priorité :
 * - Mode 1 (Monolink) : DATABASE_URL
 * - Mode 2 (Détaillé) : DB_HOST / POSTGRES_HOST, DB_PORT, DB_USER, etc.
 */
export function getPoolConfig(env: NodeJS.ProcessEnv = process.env): pg.PoolConfig {
    if (env.DATABASE_URL && env.DATABASE_URL.trim() !== '') {
        return {
            connectionString: env.DATABASE_URL,
            ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        };
    }

    return {
        host: env.DB_HOST || env.POSTGRES_HOST || 'localhost',
        port: Number(env.DB_PORT || env.POSTGRES_PORT) || 5432,
        user: env.DB_USER || env.POSTGRES_USER || undefined,
        password: env.DB_PASSWORD || env.POSTGRES_PASSWORD || undefined,
        database: env.DB_NAME || env.POSTGRES_DB || undefined,
        ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
}

/**
 * Vérifie la validité réelle de la connexion PostgreSQL (SELECT 1)
 */
export async function checkDbConnection(targetPool: pg.Pool = pool): Promise<DbConnectionResult> {
    try {
        const client = await targetPool.connect();
        try {
            await client.query('SELECT 1');
            return { success: true };
        } finally {
            client.release();
        }
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Échec de connexion BDD',
        };
    }
}

// Instance singleton par défaut pour l'application
export const pool = new pg.Pool(getPoolConfig());
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
