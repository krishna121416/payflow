const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

// The ledger is the source of truth for balance, not accounts.balance.
// Balance = total credits - total debits for that account. Accepts an
// optional transaction client so callers can compute this consistently
// inside the same DB transaction as a funds check.
async function getAccountBalance(accountId, client = prisma) {
  const [credits, debits] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { account_id: accountId, entry_type: 'credit' },
      _sum: { amount: true },
    }),
    client.ledgerEntry.aggregate({
      where: { account_id: accountId, entry_type: 'debit' },
      _sum: { amount: true },
    }),
  ]);

  const creditTotal = credits._sum.amount || new Prisma.Decimal(0);
  const debitTotal = debits._sum.amount || new Prisma.Decimal(0);
  return creditTotal.minus(debitTotal);
}

module.exports = { getAccountBalance };
