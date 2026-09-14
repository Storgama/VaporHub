import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 octets pour le vecteur d'initialisation GCM

function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY doit être une chaîne hexadécimale de 64 caractères (32 octets)');
    }
    return Buffer.from(keyHex, 'hex');
}

/**
 * Chiffre un texte en clair avec AES-256-GCM
 * Format de sortie : "iv:authTag:donneesChiffrees" (en hexadécimal)
 */
export function encrypt(text: null | undefined | ''): null;
export function encrypt(text: string): string;
export function encrypt(text: string | null | undefined): string | null;
export function encrypt(text: string | null | undefined): string | null {
    if (!text) return null;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // On combine l'IV, le tag d'authentification et les données chiffrées
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Déchiffre un texte chiffré au format "iv:authTag:donneesChiffrees"
 */
export function decrypt(encryptedText: null | undefined | ''): null;
export function decrypt(encryptedText: string): string;
export function decrypt(encryptedText: string | null | undefined): string | null;
export function decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return null;

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Format de texte chiffré invalide');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

