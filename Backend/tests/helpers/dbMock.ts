import { vi, expect } from 'vitest';
import { db } from '../../src/db/initBdd.js';

// Indique à Vitest de remplacer la vraie BDD par des fonctions espions vi.fn()
vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        execute: vi.fn()
    }
}));

/**
 * Simule db.select().from().where() -> renvoie un tableau de données
 */
export function mockSelectReturn<T>(data: T[]) {

    const chainable = {
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (resolve: (val: T[]) => unknown, reject?: (err: unknown) => unknown) =>
            Promise.resolve(data).then(resolve, reject)
    };

    vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce(chainable)
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

/**
 * Vérifie le nombre d'insertions effectuées en BDD
 */
export function expectInsertCount(count: number) {
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(count);
}
/**
 * Vérifie qu'aucune insertion n'a eu lieu (ex: Throttling actif)
 */
export function expectNoInsert() {
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
}
/**
 * Simule db.execute() avec succès
 */
export function mockExecuteResolve<T = unknown>(result: T = {} as T) {
    vi.mocked(db.execute).mockResolvedValueOnce(result as never);
}

/**
 * Simule db.execute() en échec
 */
export function mockExecuteReject(error: Error = new Error('Database error')) {
    vi.mocked(db.execute).mockRejectedValueOnce(error);
}

/**
 * Vérifie qu'au moins une mise à jour a été effectuée
 */
export function expectUpdateCalled() {
    expect(vi.mocked(db.update)).toHaveBeenCalled();
}