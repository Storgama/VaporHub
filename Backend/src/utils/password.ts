import argon2 from 'argon2';

/**
 * Hash du password pour stocker en base avec Argon2id
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    return await argon2.hash(plainPassword);
}

/**
 * Compare le mot de passe haché en BDD et le mot de passe saisi
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return await argon2.verify(hashedPassword, plainPassword);
}

