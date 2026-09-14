import { describe, it, expect } from 'vitest';
import { commercialSchema, raidSchema } from '../../src/validators/twitchActionValidator.js';

describe('🛡️ Validateur : twitchActionValidator', () => {

    describe('commercialSchema', () => {
        it('doit valider les durées autorisées par Twitch (30, 60, 90, 120, 150, 180)', () => {
            const validLengths = [30, 60, 90, 120, 150, 180];
            for (const length of validLengths) {
                const result = commercialSchema.safeParse({ length });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.length).toBe(length);
                }
            }
        });

        it('doit rejeter les durées non supportées (ex: 0, 15, 45, 200, négatif)', () => {
            const invalidLengths = [0, 15, 45, 200, -30, 999];
            for (const length of invalidLengths) {
                const result = commercialSchema.safeParse({ length });
                expect(result.success).toBe(false);
            }
        });

        it('doit rejeter si length est manquant ou n\'est pas un nombre entier', () => {
            expect(commercialSchema.safeParse({}).success).toBe(false);
            expect(commercialSchema.safeParse({ length: '60' }).success).toBe(false);
            expect(commercialSchema.safeParse({ length: 60.5 }).success).toBe(false);
        });
    });

    describe('raidSchema', () => {
        it('doit valider et normaliser un pseudo Twitch valide (3-25 chars alphanumériques + underscore)', () => {
            const validLogins = ['zerator', 'streamer_pro', 'User123', 'abc', 'streamer_long_name_25char'];
            for (const targetLogin of validLogins) {
                const result = raidSchema.safeParse({ targetLogin });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.targetLogin).toBe(targetLogin.toLowerCase());
                }
            }
        });

        it('doit rejeter les pseudos invalides (trop courts, trop longs, caractères interdits)', () => {
            const invalidLogins = [
                'ab', // < 3 chars
                'ce_pseudo_est_vraiment_beaucoup_trop_long_pour_twitch', // > 25 chars
                'user@name', // caractère spécial @
                'streamer-pro', // tiret interdit sur Twitch
                'streamer pro', // espace interdit
                ''
            ];
            for (const targetLogin of invalidLogins) {
                const result = raidSchema.safeParse({ targetLogin });
                expect(result.success).toBe(false);
            }
        });

        it('doit rejeter si targetLogin est manquant ou n\'est pas une chaîne', () => {
            expect(raidSchema.safeParse({}).success).toBe(false);
            expect(raidSchema.safeParse({ targetLogin: 12345 }).success).toBe(false);
        });
    });

});