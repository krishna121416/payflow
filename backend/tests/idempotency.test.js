const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis');
const { request, app, uniqueSuffix, createAccount } = require('./testHelpers');

beforeAll(async () => {
  await redisClient.connect();
});

afterAll(async () => {
  await redisClient.quit();
  await prisma.$disconnect();
});

test('sending the same idempotency_key twice does not duplicate the payment', async () => {
  const source = await createAccount('Idem-Source', 1000);
  const destination = await createAccount('Idem-Dest', 0);
  const idempotencyKey = `idem-test-${uniqueSuffix()}`;

  const first = await request(app).post('/api/transactions').send({
    idempotency_key: idempotencyKey,
    amount: 200,
    source_account_id: source.id,
    destination_account_id: destination.id,
  });
  expect(first.status).toBe(201);

  const second = await request(app).post('/api/transactions').send({
    idempotency_key: idempotencyKey,
    amount: 200,
    source_account_id: source.id,
    destination_account_id: destination.id,
  });
  // Replayed, not created again.
  expect(second.status).toBe(200);
  expect(second.body.id).toBe(first.body.id);

  // Exactly one transaction and one debit/credit pair in the database -
  // not two.
  const transactionCount = await prisma.transaction.count({
    where: { idempotency_key: idempotencyKey },
  });
  expect(transactionCount).toBe(1);

  const ledgerEntryCount = await prisma.ledgerEntry.count({
    where: { transaction_id: first.body.id },
  });
  expect(ledgerEntryCount).toBe(2);

  // Money deducted only once.
  const sourceBalance = await request(app).get(`/api/accounts/${source.id}/balance`);
  expect(sourceBalance.body.balance).toBe('800.00');
  const destinationBalance = await request(app).get(`/api/accounts/${destination.id}/balance`);
  expect(destinationBalance.body.balance).toBe('200.00');
});
