import argon2 from 'argon2';


/**
 * Hash du password pour stocker en base but cacher celui-ci en cas de hack de bdd
 * @param { string } plainPassword 
 * @returns mdp hasher
 */
export async function hashPassword(plainPassword) {
    return await argon2.hash(plainPassword);
}

/**
 * Compare le mdp BDD et le mdp saisie par l'utilisateur
 * @param { string } hashedPassword 
 * @param { string } plainPassword 
 * @returns Ok | NOT OK
 */
export async function verifyPassword(hashedPassword, plainPassword) {
    return await argon2.verify(hashedPassword, plainPassword);
}