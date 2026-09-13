// A known, expected error we deliberately raise (bad input, missing
// resource, business-rule violation). The error handler renders these as
// clean JSON; anything that is NOT an AppError is treated as a bug and
// returned as a generic 500 with no internal details leaked.
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = AppError;
