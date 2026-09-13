const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { getAccountBalance } = require('./ledger.service');
const { getCachedTransaction, cacheTransaction } = require('./idempotency.service');

// Locks both account rows (SELECT ... FOR UPDATE, ascending id order)
// before checking or moving any money. The lock serializes concurrent
// transfers touching either account; the fixed lock order avoids deadlock
// between transfers moving money in opposite directions.
async function runTransaction({ idempotency_key, amount, source_account_id, destination_account_id }) {
  return prisma.$transaction(async (tx) => {
    const [firstId, secondId] = [source_account_id, destination_account_id].sort();
    const lockedRows = await tx.$queryRaw`
      SELECT id FROM accounts WHERE id IN (${firstId}, ${secondId}) ORDER BY id FOR UPDATE
    `;
    const foundIds = new Set(lockedRows.map((row) => row.id));

    if (!foundIds.has(source_account_id)) {
      throw new AppError(404, 'account_not_found', 'source_account_id does not exist');
    }
    if (!foundIds.has(destination_account_id)) {
      throw new AppError(404, 'account_not_found', 'destination_account_id does not exist');
    }

    const sourceBalance = await getAccountBalance(source_account_id, tx);
    if (sourceBalance.lessThan(amount)) {
      throw new AppError(422, 'insufficient_funds', 'source account does not have sufficient funds');
    }

    const transaction = await tx.transaction.create({
      data: {
        idempotency_key,
        status: 'completed',
        amount,
        source_account_id,
        destination_account_id,
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          transaction_id: transaction.id,
          account_id: source_account_id,
          entry_type: 'debit',
          amount,
        },
        {
          transaction_id: transaction.id,
          account_id: destination_account_id,
          entry_type: 'credit',
          amount,
        },
      ],
    });

    await tx.account.update({
      where: { id: source_account_id },
      data: { balance: { decrement: amount } },
    });
    await tx.account.update({
      where: { id: destination_account_id },
      data: { balance: { increment: amount } },
    });

    return transaction;
  }, { timeout: 10000 });
}

// Returns { transaction, replayed }. replayed=true means no money moved -
// this just returns the result of a transaction that already happened.
async function createTransaction(input) {
  const { idempotency_key } = input;

  const cached = await getCachedTransaction(idempotency_key);
  if (cached) {
    return { transaction: cached, replayed: true };
  }

  const existing = await prisma.transaction.findUnique({ where: { idempotency_key } });
  if (existing) {
    await cacheTransaction(idempotency_key, existing);
    return { transaction: existing, replayed: true };
  }

  try {
    const transaction = await runTransaction(input);
    await cacheTransaction(idempotency_key, transaction);
    return { transaction, replayed: false };
  } catch (err) {
    // Two requests raced past the findUnique check above with the same
    // new key; Postgres's unique constraint rejected the loser with
    // P2002. Return the winner's result instead of a conflict error.
    if (err.code === 'P2002') {
      const winner = await prisma.transaction.findUnique({ where: { idempotency_key } });
      if (winner) {
        await cacheTransaction(idempotency_key, winner);
        return { transaction: winner, replayed: true };
      }
    }
    throw err;
  }
}

module.exports = { createTransaction };
