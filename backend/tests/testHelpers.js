const request = require('supertest');
const app = require('../src/app');

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createAccount(ownerNamePrefix, initialBalance, accountType = 'personal') {
  const res = await request(app).post('/api/accounts').send({
    owner_name: `${ownerNamePrefix}-${uniqueSuffix()}`,
    account_type: accountType,
    initial_balance: initialBalance,
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test account: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

module.exports = { app, request, uniqueSuffix, createAccount };
