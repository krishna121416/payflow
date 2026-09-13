const AppError = require('./AppError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function requireUuid(value, fieldName) {
  if (!isValidUuid(value)) {
    throw new AppError(400, 'validation_error', `${fieldName} must be a valid account id`);
  }
}

module.exports = { isValidUuid, requireUuid };
