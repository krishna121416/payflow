const redisClient = require('../config/redis');

const TTL_SECONDS = 60 * 60 * 24;

function cacheKey(idempotency_key) {
  return `idempotency:transaction:${idempotency_key}`;
}

// Falls back to null on any Redis failure - transaction.service.js then
// checks Postgres instead, so correctness never depends on Redis being up.
async function getCachedTransaction(idempotency_key) {
  try {
    const cached = await redisClient.get(cacheKey(idempotency_key));
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Redis get failed, falling back to Postgres:', err.message);
    return null;
  }
}

async function cacheTransaction(idempotency_key, transaction) {
  try {
    await redisClient.set(cacheKey(idempotency_key), JSON.stringify(transaction), {
      EX: TTL_SECONDS,
    });
  } catch (err) {
    console.error('Redis set failed, continuing without cache:', err.message);
  }
}

module.exports = { getCachedTransaction, cacheTransaction };
