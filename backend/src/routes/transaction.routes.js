const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const transactionController = require('../controllers/transaction.controller');

const router = express.Router();

router.post('/transactions', asyncHandler(transactionController.createTransaction));

module.exports = router;
