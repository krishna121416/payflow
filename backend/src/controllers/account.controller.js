const AppError = require('../utils/AppError');
const { isValidMonetaryAmount } = require('../utils/money');
const accountService = require('../services/account.service');
const { getAccountBalance } = require('../services/ledger.service');
const prisma = require('../config/prisma');

const VALID_ACCOUNT_TYPES = ['personal', 'business'];

async function createAccount(req, res) {
  const { owner_name, account_type, initial_balance } = req.body;

  if (typeof owner_name !== 'string' || owner_name.trim().length === 0) {
    throw new AppError(400, 'validation_error', 'owner_name is required');
  }

  if (!VALID_ACCOUNT_TYPES.includes(account_type)) {
    throw new AppError(
      400,
      'validation_error',
      `account_type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`
    );
  }

  if (!isValidMonetaryAmount(initial_balance)) {
    throw new AppError(
      400,
      'validation_error',
      'initial_balance must be a valid monetary amount (at most 2 decimal places)'
    );
  }

  if (initial_balance < 0) {
    throw new AppError(400, 'validation_error', 'initial_balance must not be negative');
  }

  const account = await accountService.createAccount({
    owner_name: owner_name.trim(),
    account_type,
    initial_balance,
  });

  res.status(201).json(account);
}

async function listAccounts(req, res) {
  const accounts = await prisma.account.findMany({
    where: { account_type: { not: 'system' } },
    orderBy: { created_at: 'asc' },
  });

  const withBalances = await Promise.all(
    accounts.map(async (account) => ({
      id: account.id,
      owner_name: account.owner_name,
      account_type: account.account_type,
      balance: (await getAccountBalance(account.id)).toFixed(2),
      created_at: account.created_at,
    }))
  );

  res.json(withBalances);
}

// Recomputes from ledger entries rather than reading accounts.balance.
async function getBalance(req, res) {
  const { id } = req.params;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    throw new AppError(404, 'account_not_found', 'account not found');
  }

  const balance = await getAccountBalance(id);

  res.json({ account_id: id, balance: balance.toFixed(2) });
}

async function getTransactionHistory(req, res) {
  const { id } = req.params;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    throw new AppError(404, 'account_not_found', 'account not found');
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ source_account_id: id }, { destination_account_id: id }],
    },
    orderBy: { created_at: 'desc' },
  });

  res.json({
    account_id: id,
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      source_account_id: t.source_account_id,
      destination_account_id: t.destination_account_id,
      status: t.status,
      created_at: t.created_at,
    })),
  });
}

module.exports = { createAccount, listAccounts, getBalance, getTransactionHistory };
