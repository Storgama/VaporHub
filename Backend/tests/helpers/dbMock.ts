import { vi } from 'vitest';
import { db } from '../../src/db/initBdd.js';

// Indique à Vitest de remplacer la vraie BDD par des fonctions espions vi.fn()
vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

/**
 * Simule db.select().from().where() -> renvoie un tableau de données
 */
export function mockSelectReturn<T>(data: T[]) {
    vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce(data)
        })
    } as unknown as ReturnType<typeof db.select>);
}

/**
 * Simule db.insert().values().returning() -> renvoie les entités créées
 */
export function mockInsertReturning<T>(data: T[]) {
    vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce(data)
        })
    } as unknown as ReturnType<typeof db.insert>);
}

/**
 * Simule db.insert().values() sans returning (ex: refresh token)
 */
export function mockInsertResolve() {
    vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce({})
    } as unknown as ReturnType<typeof db.insert>);
}

/**
 * Simule db.update().set().where()
 */
export function mockUpdateResolve() {
    vi.mocked(db.update).mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce({})
        })
    } as unknown as ReturnType<typeof db.update>);
}

/**
 * Simule db.delete().where()
 */
export function mockDeleteResolve() {
    vi.mocked(db.delete).mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce({})
    } as unknown as ReturnType<typeof db.delete>);
}