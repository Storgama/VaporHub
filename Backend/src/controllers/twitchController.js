export const getStreamStats = async (req, res, next) => {
    /**
     * notre fameux controller !
     * alors try ça veut dire 
     * ATTEND FRERO ! je test un truc
     * ensuite tu catch en gros c'est le bro qui te rattrape quand tu te plante x)
     * 
     */
    try {
        // Simulation de données (Mock = j'imite un truc)
        const stats = {
            channel: 'Pominus',
            isLive: true,
            viewerCount: 15,
            lastStreamDate: new Date().toISOString()
        };

        /**
         * tu va me dire mais pourquoi tu fait ça flemme de dev le call de twitch la donc j'ai fait semblant
         */
        res.json(stats);
        
    } catch (error) {
        /**
         * ça affiche l'erreur c'est du express
         */
        next(error); // Transmet l'erreur au middleware global
    }
}