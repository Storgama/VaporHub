import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getPoolConfig, checkDbConnection } from '../../src/db/initBdd.js';
import pg from 'pg';

describe('🌐 init.Bdd - Configuration & Connexion BDD', () => {

    // Cas 1 : Monolink prioritaire
    it('doit configurer le Pool avec le monolink si DATABASE_URL est fourni', () => {
        const fakeEnv = {
            DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/vaporhub_db',
            DB_HOST: 'autre-serveur' // Ne doit pas être utilisé
        };

        const config = getPoolConfig(fakeEnv as any);
        expect(config.connectionString).toBe('postgresql://postgres:secret@localhost:5432/vaporhub_db');
        expect(config.host).toBeUndefined();
    });

    // Cas 2 : Paramètres décomposés (quand pas de DATABASE_URL)
    it('doit basculer sur les paramètres décomposés si DATABASE_URL est absent', () => {
        const fakeEnv = {
            DB_HOST: 'db.mondomaine.internal',
            DB_PORT: '5433',
            DB_USER: 'vapor_user',
            DB_PASSWORD: 'super_password_123',
            DB_NAME: 'vapor_prod'
        };

        const config = getPoolConfig(fakeEnv as any);
        expect(config.connectionString).toBeUndefined();
        expect(config.host).toBe('db.mondomaine.internal');
        expect(config.port).toBe(5433);
        expect(config.user).toBe('vapor_user');
        expect(config.password).toBe('super_password_123');
        expect(config.database).toBe('vapor_prod');
    });

    // Cas 3 : Test de validation de connexion (succès)
    it('checkDbConnection doit renvoyer success: true si la BDD répond', async () => {
        const mockClient = {
            query: vi.fn().mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }),
            release: vi.fn()
        };
        const mockPool = {
            connect: vi.fn().mockResolvedValueOnce(mockClient)
        } as unknown as pg.Pool;

        const result = await checkDbConnection(mockPool);
        expect(result.success).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
        expect(mockClient.release).toHaveBeenCalled();
    });

    // Cas 4 : Test de validation de connexion (échec)
    it('checkDbConnection doit renvoyer success: false avec le message d\'erreur si la BDD échoue', async () => {
        const mockPool = {
            connect: vi.fn().mockRejectedValueOnce(new Error('Connection refused'))
        } as unknown as pg.Pool;

        const result = await checkDbConnection(mockPool);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection refused');
    });

});