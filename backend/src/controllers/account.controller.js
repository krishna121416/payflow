const AppError = require('../utils/AppError');
const { isValidMonetaryAmount } = require('../utils/money');
const accountService = require('../services/account.service');

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

module.exports = { createAccount };
