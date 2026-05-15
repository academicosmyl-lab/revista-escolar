/**
 * middlewares/error.middleware.js
 * Manejo global de errores — nunca expone stack traces al cliente en producción
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const esProduccion = process.env.NODE_ENV === 'production';

  // Log completo en servidor
  if (statusCode >= 500) {
    console.error('❌ Error del servidor:', {
      mensaje: err.message,
      ruta: req.originalUrl,
      metodo: req.method,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    // Solo mostrar detalles en desarrollo
    ...((!esProduccion && err.details) && { detalles: err.details }),
  });
}

/**
 * Crear error personalizado con statusCode
 */
function crearError(mensaje, statusCode = 500, details = null) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}

module.exports = { errorHandler, crearError };
