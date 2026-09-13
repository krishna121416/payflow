// Fallback handlers. Full structured error responses (400/404/409/422) are
// added feature-by-feature; this just guarantees the API never leaks a raw
// stack trace and never crashes the process on an unhandled error.

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };
