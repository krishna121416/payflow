const express = require('express');
const prisma = require('../config/prisma');
const redisClient = require('../config/redis');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'unreachable' });
  }
});

router.get('/health/redis', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', redis: 'unreachable' });
  }
});

module.exports = router;
