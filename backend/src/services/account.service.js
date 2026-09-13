const prisma = require('../config/prisma');
const { SYSTEM_EQUITY_ACCOUNT_ID } = require('../config/constants');

// Idempotent - upsert is a no-op if the account already exists. Its
// balance is allowed to go negative since it funds every opening balance.
async function ensureEquityAccount(client) {
  await client.account.upsert({
    where: { id: SYSTEM_EQUITY_ACCOUNT_ID },
    update: {},
    create: {
      id: SYSTEM_EQUITY_ACCOUNT_ID,
      owner_name: 'SYSTEM_EQUITY',
      account_type: 'system',
      balance: 0,
    },
  });
}

// A nonzero opening balance is recorded as a debit on the equity account
// and a credit on the new account, so it's a real ledger movement rather
// than a bare balance write.
async function createAccount({ owner_name, account_type, initial_balance }) {
  return prisma.$transaction(async (tx) => {
    await ensureEquityAccount(tx);

    const account = await tx.account.create({
      data: {
        owner_name,
        account_type,
        balance: initial_balance,
      },
    });

    if (initial_balance > 0) {
      const transaction = await tx.transaction.create({
        data: {
          idempotency_key: `account-opening-${account.id}`,
          status: 'completed',
          amount: initial_balance,
          source_account_id: SYSTEM_EQUITY_ACCOUNT_ID,
          destination_account_id: account.id,
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            transaction_id: transaction.id,
            account_id: SYSTEM_EQUITY_ACCOUNT_ID,
            entry_type: 'debit',
            amount: initial_balance,
          },
          {
            transaction_id: transaction.id,
            account_id: account.id,
            entry_type: 'credit',
            amount: initial_balance,
          },
        ],
      });

      await tx.account.update({
        where: { id: SYSTEM_EQUITY_ACCOUNT_ID },
        data: { balance: { decrement: initial_balance } },
      });
    }

    return account;
  });
}

module.exports = { createAccount, ensureEquityAccount };
