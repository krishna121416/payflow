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

// Independently sums BOTH sides of the entire ledger, across all accounts.
// This is what makes reconciliation meaningful: it never looks at
// accounts.balance (a cache), only at the raw debit/credit rows every
// transaction is required to write in pairs.
async function getLedgerTotals() {
  const [debits, credits] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { entry_type: 'debit' },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { entry_type: 'credit' },
      _sum: { amount: true },
    }),
  ]);

  const totalDebits = debits._sum.amount || new Prisma.Decimal(0);
  const totalCredits = credits._sum.amount || new Prisma.Decimal(0);
  return { totalDebits, totalCredits };
}

module.exports = { getAccountBalance, getLedgerTotals };
