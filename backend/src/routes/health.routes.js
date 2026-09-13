const express = require('express');

const router = express.Router();

// Simple liveness check - confirms the API process is up and responding.
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
