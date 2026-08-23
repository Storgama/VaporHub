export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err.stack);

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erreur interne du serveur',
      status: err.status || 500
    }
  });
};