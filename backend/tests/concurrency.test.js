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

test('only one of two concurrent overdrawing transfers succeeds', async () => {
  const source = await createAccount('Conc-Source', 500);
  const destination = await createAccount('Conc-Dest', 0);

  const send400 = request(app).post('/api/transactions').send({
    idempotency_key: `conc-400-${uniqueSuffix()}`,
    amount: 400,
    source_account_id: source.id,
    destination_account_id: destination.id,
  });
  const send300 = request(app).post('/api/transactions').send({
    idempotency_key: `conc-300-${uniqueSuffix()}`,
    amount: 300,
    source_account_id: source.id,
    destination_account_id: destination.id,
  });

  const [res400, res300] = await Promise.all([send400, send300]);

  const statuses = [res400.status, res300.status].sort();
  // Exactly one succeeds (201); the other is correctly rejected (422) -
  // never both succeeding, which would overdraw the account.
  expect(statuses).toEqual([201, 422]);

  const balanceRes = await request(app).get(`/api/accounts/${source.id}/balance`);
  const finalBalance = Number(balanceRes.body.balance);

  // Never negative, and matches whichever single transfer actually won.
  expect(finalBalance).toBeGreaterThanOrEqual(0);
  expect([100, 200]).toContain(finalBalance);

  // Ledger stays consistent: exactly as many debit rows on the source
  // account as transactions that actually succeeded (1), each paired with
  // a credit.
  const successfulCount = [res400.status, res300.status].filter((s) => s === 201).length;
  expect(successfulCount).toBe(1);

  const debitCount = await prisma.ledgerEntry.count({
    where: { account_id: source.id, entry_type: 'debit' },
  });
  const creditCount = await prisma.ledgerEntry.count({
    where: { account_id: destination.id, entry_type: 'credit' },
  });
  expect(debitCount).toBe(1);
  expect(creditCount).toBe(1);
});
