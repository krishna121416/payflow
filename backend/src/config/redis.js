const { createClient } = require('redis');

// Idempotency cache only - see idempotency.service.js. Never used as a
// lock or a queue, and never the only place a transaction result lives.
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

module.exports = redisClient;
