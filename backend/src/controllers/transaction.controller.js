const AppError = require('../utils/AppError');
const { isValidMonetaryAmount } = require('../utils/money');
const { requireUuid } = require('../utils/validation');
const transactionService = require('../services/transaction.service');

async function createTransaction(req, res) {
  const { idempotency_key, amount, source_account_id, destination_account_id } = req.body;

  if (typeof idempotency_key !== 'string' || idempotency_key.trim().length === 0) {
    throw new AppError(400, 'validation_error', 'idempotency_key is required');
  }

  if (!isValidMonetaryAmount(amount) || amount <= 0) {
    throw new AppError(400, 'validation_error', 'amount must be a positive monetary value');
  }

  requireUuid(source_account_id, 'source_account_id');
  requireUuid(destination_account_id, 'destination_account_id');

  if (source_account_id === destination_account_id) {
    throw new AppError(400, 'validation_error', 'source_account_id and destination_account_id must differ');
  }

  const transaction = await transactionService.createTransaction({
    idempotency_key: idempotency_key.trim(),
    amount,
    source_account_id,
    destination_account_id,
  });

  res.status(201).json(transaction);
}

module.exports = { createTransaction };
