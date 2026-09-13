const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.get('/admin/reconcile', asyncHandler(adminController.reconcile));

module.exports = router;
