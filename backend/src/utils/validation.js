const AppError = require('./AppError');

// UUIDs are the only thing our IDs can be (Prisma default(uuid())), so a
// quick shape check lets us return a clean 400 instead of letting an
// obviously-bad ID fall through to a Prisma cast error.
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
