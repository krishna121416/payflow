require('dotenv').config();
const app = require('./app');
const redisClient = require('./config/redis');

const PORT = process.env.PORT || 4000;

async function start() {
  await redisClient.connect();
  app.listen(PORT, () => {
    console.log(`PayFlow API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start PayFlow API:', err);
  process.exit(1);
});
