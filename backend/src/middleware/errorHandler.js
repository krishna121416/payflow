const AppError = require('../utils/AppError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }

  // Unexpected/unhandled error - log full detail server-side, but never
  // leak stack traces or DB internals to the client.
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };
