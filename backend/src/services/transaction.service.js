const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { getAccountBalance } = require('./ledger.service');

// NOTE: this does not yet lock the source account row, so two concurrent
// requests can both read the same "sufficient funds" answer before either
// writes - a real race. Row-level locking is added in the next phase
// (concurrency-safe balance handling); this version already gets the
// atomicity right (all-or-nothing per request) via one Prisma $transaction.
async function createTransaction({ idempotency_key, amount, source_account_id, destination_account_id }) {
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

    let transaction;
    try {
      transaction = await tx.transaction.create({
        data: {
          idempotency_key,
          status: 'completed',
          amount,
          source_account_id,
          destination_account_id,
        },
      });
    } catch (err) {
      // The unique constraint on idempotency_key is our safety net even if
      // the application-level idempotency check (added next phase) is
      // bypassed or races.
      if (err.code === 'P2002') {
        throw new AppError(409, 'idempotency_key_conflict', 'idempotency_key has already been used');
      }
      throw err;
    }

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

module.exports = { createTransaction };
