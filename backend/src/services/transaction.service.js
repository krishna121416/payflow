const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { getAccountBalance } = require('./ledger.service');
const { getCachedTransaction, cacheTransaction } = require('./idempotency.service');

// NOTE: this does not yet lock the source account row, so two concurrent
// requests for DIFFERENT idempotency keys against the same account can
// both read the same "sufficient funds" answer before either writes - a
// real race. Row-level locking is added in the next phase (concurrency-
// safe balance handling); this version already gets per-request atomicity
// right (all-or-nothing) via one Prisma $transaction.
async function runTransaction({ idempotency_key, amount, source_account_id, destination_account_id }) {
  return prisma.$transaction(async (tx) => {
    const [sourceAccount, destinationAccount] = await Promise.all([
      tx.account.findUnique({ where: { id: source_account_id } }),
      tx.account.findUnique({ where: { id: destination_account_id } }),
    ]);

    if (!sourceAccount) {
      throw new AppError(404, 'account_not_found', 'source_account_id does not exist');
    }
    if (!destinationAccount) {
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
  });
}

// Returns { transaction, replayed }. replayed=true means this call did NOT
// move any money - it just handed back the result of a transaction that
// already happened, identified by idempotency_key.
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
    // Two requests with the same NEW idempotency_key raced each other past
    // the findUnique check above; Postgres's unique constraint is the
    // final arbiter and rejected the loser with P2002. The loser did not
    // fail the payment - it just lost a race to record it - so fetch and
    // return the winner's result instead of surfacing a conflict.
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
