const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.post('/accounts', asyncHandler(accountController.createAccount));
router.get('/accounts/:id/balance', asyncHandler(accountController.getBalance));

module.exports = router;
