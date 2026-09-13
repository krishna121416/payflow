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

test('total debits equal total credits after several valid transactions', async () => {
  const a = await createAccount('Rec-A', 1000);
  const b = await createAccount('Rec-B', 0);
  const c = await createAccount('Rec-C', 0);

  const t1 = await request(app).post('/api/transactions').send({
    idempotency_key: `rec-1-${uniqueSuffix()}`,
    amount: 300,
    source_account_id: a.id,
    destination_account_id: b.id,
  });
  expect(t1.status).toBe(201);

  const t2 = await request(app).post('/api/transactions').send({
    idempotency_key: `rec-2-${uniqueSuffix()}`,
    amount: 120,
    source_account_id: b.id,
    destination_account_id: c.id,
  });
  expect(t2.status).toBe(201);

  const t3 = await request(app).post('/api/transactions').send({
    idempotency_key: `rec-3-${uniqueSuffix()}`,
    amount: 50,
    source_account_id: c.id,
    destination_account_id: a.id,
  });
  expect(t3.status).toBe(201);

  const reconcile = await request(app).get('/api/admin/reconcile');

  expect(reconcile.status).toBe(200);
  expect(reconcile.body.total_debits).toBe(reconcile.body.total_credits);
  expect(reconcile.body.reconciled).toBe(true);
});
