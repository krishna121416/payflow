// Finite number with at most 2 decimal places (e.g. 200 or 199.99).
function isValidMonetaryAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const cents = Math.round(value * 100);
  return Math.abs(cents - value * 100) < 1e-6;
}

module.exports = { isValidMonetaryAmount };
