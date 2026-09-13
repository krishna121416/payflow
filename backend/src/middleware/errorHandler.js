const AppError = require('../utils/AppError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'validation_error', message: 'Request body must be valid JSON' });
  }

  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };
