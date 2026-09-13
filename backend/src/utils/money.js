// Accepts only a plain finite number with at most 2 decimal places (e.g.
// 200 or 199.99, not 199.999 or "200"). Rejecting anything else here means
// the rest of the app can trust that every monetary value it handles is
// safe to hand to Prisma's Decimal column.
function isValidMonetaryAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const cents = Math.round(value * 100);
  return Math.abs(cents - value * 100) < 1e-6;
}

module.exports = { isValidMonetaryAmount };
