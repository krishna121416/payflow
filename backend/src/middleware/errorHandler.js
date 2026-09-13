const AppError = require('../utils/AppError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }

  // express.json() throws this when the request body isn't valid JSON.
  // That's a client mistake, not a server bug, so it belongs in the same
  // clean 400 shape as our own validation errors - not a leaked 500.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'validation_error', message: 'Request body must be valid JSON' });
  }

  // Unexpected/unhandled error - log full detail server-side, but never
  // leak stack traces or DB internals to the client.
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };
