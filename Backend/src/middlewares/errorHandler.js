export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err.stack);
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: (isProd && status === 500) ? 'Erreur interne du serveur' : (err.message || 'Une erreur est survenue'),
      status
    }
  });
};
