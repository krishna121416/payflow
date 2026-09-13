const prisma = require('../config/prisma');
const { SYSTEM_EQUITY_ACCOUNT_ID } = require('../config/constants');

// Makes sure the internal equity account exists. Safe to call repeatedly -
// upsert is a no-op if it's already there. Its balance is allowed to go
// negative (it's the "funding source" for every opening balance), so it is
// deliberately never checked for sufficient funds like a normal account.
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

// Creates an account and, if it opens with a nonzero balance, represents
// that balance as a real double-entry movement: a debit on the system
// equity account and a credit on the new account. This keeps "total debits
// = total credits" true across the whole ledger, including account
// creation - not just ordinary payments.
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
