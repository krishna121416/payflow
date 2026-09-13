const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

// Balance = total credits - total debits. Accepts an optional transaction
// client so this can run consistently inside a locked $transaction.
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
