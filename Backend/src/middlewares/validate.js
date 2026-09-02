export function validate(schema) {
    return async (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Données invalides';
            return res.status(400).json({ error: firstError });
        }

        // Remplace le body par les données validées et nettoyées
        req.body = result.data;
        next();
    };
}