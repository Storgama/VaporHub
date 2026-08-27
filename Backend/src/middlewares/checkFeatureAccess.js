/**
 * Middleware V1 : Laisse tout passer.
 * préparation pour la vérification des accès
 */
export function checkFeatureAccess () {
    return async (req, res, next) => {
        // V1 : Accès libre pour tout le monde
        const isAllowed = true; 

        if (!isAllowed) {
            return res.status(403).json({ error: `Accès refusé à la fonctionnalité : ${featureName}` });
        }

        next();
    };
}