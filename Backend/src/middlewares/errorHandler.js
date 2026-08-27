export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err.stack);

  /**
   * je te la fait très court ça afficher l'erreur avec tout ce dont on a besoin pour debugger
   */
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erreur interne du serveur',
      status: err.status || 500
    }
  });
};