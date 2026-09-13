const AppError = require('../utils/AppError');
const { isValidMonetaryAmount } = require('../utils/money');
const { requireUuid } = require('../utils/validation');
const { SYSTEM_EQUITY_ACCOUNT_ID } = require('../config/constants');
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

  // SYSTEM_EQUITY only ever moves money as part of account creation
  // (account.service.js). It must never be reachable as a party to an
  // ordinary payment, or a client could deposit into or drain it directly
  // through this endpoint.
  if (source_account_id === SYSTEM_EQUITY_ACCOUNT_ID || destination_account_id === SYSTEM_EQUITY_ACCOUNT_ID) {
    throw new AppError(400, 'validation_error', 'account_id refers to an internal system account and cannot be used here');
  }

  const { transaction, replayed } = await transactionService.createTransaction({
    idempotency_key: idempotency_key.trim(),
    amount,
    source_account_id,
    destination_account_id,
  });

  // 200 = "here is the result of a payment that already happened" (no money
  // moved this call). 201 = a new payment was just created.
  res.status(replayed ? 200 : 201).json(transaction);
}

module.exports = { createTransaction };
