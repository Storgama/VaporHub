export const getStreamStats = async (req, res, next) => {
    try {
        // Simulation de données (Mock)
        const stats = {
            channel: 'Pominus',
            isLive: true,
            viewerCount: 15,
            lastStreamDate: new Date().toISOString()
        };
        /**
         * JE suis un test de PR
         */

        res.json(stats);
    } catch (error) {
        next(error); // Transmet l'erreur au middleware global
    }
}