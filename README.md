# PayFlow

A simplified double-entry payment gateway backend, built as a personal/academic
project to practice the parts of backend engineering that are easy to get
wrong: transactional data integrity, double-entry accounting, idempotent API
design, PostgreSQL transactions, and concurrency control.

It is intentionally a small, understandable monolith - not a
production-grade payments system. The goal is to be able to explain every
line of it in an interview.

**Stack:** Node.js, Express, Prisma, PostgreSQL, Redis (idempotency cache
only), React, Jest + Supertest, Docker Compose.

---

## What is PayFlow?

PayFlow lets you create accounts and move money between them. Every account
has a balance; every payment debits the source account and credits the
destination account. Under the hood, it's built like a real accounting
system rather than a simple "update two balance columns" toy: every
successful payment writes an immutable pair of ledger rows, and the
account's balance is always *derived* from those rows, not trusted as a
cached number.

## Double-Entry Ledger

Every movement of money creates **two** ledger entries in the same database
transaction:

1. A **debit** on the source account
2. A **credit** on the destination account

```
Account A: ₹1,000        Account B: ₹500

A sends ₹200 to B:
  ledger_entries: { account: A, type: debit,  amount: 200 }
                  { account: B, type: credit, amount: 200 }

Account A: ₹800           Account B: ₹700
```

Because every entry has a matching opposite entry, the following is always
true across the *entire* ledger:

```
TOTAL DEBITS = TOTAL CREDITS
```

This even applies to opening an account with a starting balance: rather than
just writing a balance number, account creation moves money from a fixed,
internal `SYSTEM_EQUITY` account into the new account (one debit, one
credit), so the invariant holds from the very first row, not just once
payments start happening.

## Why It Matters

Double-entry accounting isn't bureaucratic overhead - it's a built-in
correctness check. If a bug ever caused:

- **duplicated money** (a payment applied twice),
- **missing money** (a debit written without its credit, or vice versa),
- **an incomplete transaction** (a transaction row with no ledger entries),
- or any other accounting inconsistency,

...then summing all debits and all credits across the ledger would no
longer match. See [Reconciliation](#reconciliation) below - that's exactly
what `GET /api/admin/reconcile` checks, independently of any cached balance.

## Idempotency

**Idempotency key** = a client-supplied unique string identifying one
logical payment attempt.

Concrete example: a user double-clicks the "Pay" button, or a flaky network
connection causes a client to retry a request that actually succeeded on the
server. Without idempotency, that's a duplicate payment. With it, the second
request is recognized as "the same payment attempt" and simply returns the
result of the first one - no money moves twice.

PayFlow checks, in order:
1. **Redis** - a fast cache keyed by `idempotency_key`, purely a latency
   optimization.
2. **PostgreSQL**, by the same key - the real source of truth.
3. If two requests race past both checks simultaneously (a genuine
   concurrent duplicate), Postgres's **unique constraint** on
   `idempotency_key` rejects the loser's `INSERT`, and PayFlow catches that
   and returns the winner's result instead of an error.

A repeated `idempotency_key` returns `200 OK` with the original transaction.
A new one returns `201 Created`. Either way, the database ends up with
exactly one transaction row and one debit/credit pair - never a duplicate.

## Why PostgreSQL instead of MongoDB?

This project leans heavily on relational, transactional guarantees:

- **ACID transactions** - a payment's transaction row, debit entry, credit
  entry, and both balance updates must all succeed or all fail together.
- **Foreign keys** - a ledger entry physically cannot reference a
  nonexistent account or transaction; the database enforces it, not just
  application code.
- **Unique constraints** - `idempotency_key` uniqueness is guaranteed at the
  storage layer, not just checked in JavaScript.
- **Row-level locking** (`SELECT ... FOR UPDATE`) - needed for the
  concurrency-safe balance check described below.

None of this is a knock on MongoDB - it's an excellent fit for many
problems. This particular problem (money movement with hard consistency
requirements) is a natural fit for a relational database with real
transactions and constraints.

## Redis

Redis is used for **exactly one thing**: caching the result of a completed
transaction, keyed by `idempotency_key`, so a repeated request can be
answered quickly without hitting Postgres.

Redis is **not** used as:
- a message queue,
- a distributed lock,
- or the primary/only record of a transaction.

If Redis is down or a key has been evicted, PayFlow simply falls back to
checking Postgres directly (slower, but still correct). Postgres's unique
constraint - not Redis - is what actually guarantees a payment is never
processed twice.

## Concurrency

Consider: Account A has ₹500. Two requests arrive at nearly the same time -
one transferring ₹400, the other ₹300. If both requests read the balance
before either writes, both could see "₹500, sufficient funds" and both
succeed, overdrawing the account.

PayFlow prevents this with PostgreSQL row-level locking. Before checking or
moving any money, it locks both the source and destination account rows with
`SELECT ... FOR UPDATE`, always in a fixed (ascending id) order:

- The lock forces a second concurrent request touching either row to wait
  until the first one commits or rolls back, so it always sees the true,
  up-to-date balance - never a stale one.
- Locking in a **fixed order** (not "source, then destination") means two
  transfers moving money in *opposite* directions between the same two
  accounts can never deadlock waiting on each other's lock.

This was verified directly: firing two concurrent ₹400/₹300 transfers
against a ₹500 balance, repeatedly, always resulted in exactly one success
and one `422 insufficient_funds` - never both succeeding, never a negative
balance.

## Reconciliation

`GET /api/admin/reconcile` independently sums every debit and every credit
across the *entire* `ledger_entries` table and reports whether they match.

> The ledger is double-entry. Every successful movement of money creates one
> debit and one credit. The reconciliation endpoint independently sums both
> sides of the ledger and verifies that they remain equal.

Critically, this endpoint never looks at the cached `accounts.balance`
column - only at raw ledger rows. It was verified by deliberately inserting
an unmatched debit row directly into the database: the endpoint immediately
reported `reconciled: false` with the correct mismatched totals, then
`true` again once the stray row was removed.

---

## Running Locally

### Option A - Docker Compose (recommended, one command)

Starts PostgreSQL, Redis, and the API together, applies migrations
automatically, and persists Postgres data in a named volume.

```bash
docker compose up --build
```

API is now available at `http://localhost:4000`. Try:

```bash
curl http://localhost:4000/api/health
```

### Option B - Manual local dev

Requires a running PostgreSQL and Redis (e.g. via `docker run`, or your own
install).

**Backend:**

```bash
cd backend
npm install
cp .env.example .env        # edit if your DB/Redis aren't on localhost defaults
npx prisma migrate deploy
npm run dev                 # http://localhost:4000
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

### Running tests

Requires Postgres + Redis reachable (Docker Compose, or your own containers,
with `backend/.env` pointed at them):

```bash
cd backend
npm test
```

---

## API Documentation

All endpoints are prefixed with `/api`. Money fields are returned as decimal
strings (e.g. `"200.00"`), never floating-point numbers, to avoid precision
loss.

Every error response has the shape:

```json
{ "error": "error_code", "message": "human-readable description" }
```

| Status | Meaning |
|---|---|
| 400 | Validation error (bad/missing input, malformed JSON) |
| 404 | Account not found |
| 409 | Idempotency/conflict condition |
| 422 | Insufficient funds |
| 500 | Unexpected server error (no internals leaked) |

### Health

```
GET /api/health
GET /api/health/db      -> confirms Prisma can reach Postgres
GET /api/health/redis    -> confirms Redis is reachable
```
```json
{ "status": "ok" }
```

### Create an account

```
POST /api/accounts
```
Request:
```json
{ "owner_name": "Alice", "account_type": "personal", "initial_balance": 1000 }
```
`account_type` is `personal` or `business`. `initial_balance` must be
`>= 0`, with at most 2 decimal places. A nonzero opening balance is recorded
as a real ledger movement from the internal equity account (see
[Double-Entry Ledger](#double-entry-ledger)).

Response `201`:
```json
{
  "id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c",
  "owner_name": "Alice",
  "account_type": "personal",
  "balance": "1000",
  "created_at": "2026-09-13T15:25:18.266Z"
}
```

### List accounts

```
GET /api/accounts
```
Returns every account (excluding the internal equity account) with its
ledger-derived balance.

Response `200`:
```json
[
  { "id": "...", "owner_name": "Alice", "account_type": "personal", "balance": "1000.00", "created_at": "..." },
  { "id": "...", "owner_name": "Bob", "account_type": "business", "balance": "0.00", "created_at": "..." }
]
```

### Get account balance

```
GET /api/accounts/:id/balance
```
Always recomputed from ledger entries (`SUM(credits) - SUM(debits)`), never
read from the cached column.

Response `200`:
```json
{ "account_id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c", "balance": "800.00" }
```
`404` if the account doesn't exist.

### Get transaction history

```
GET /api/accounts/:id/transactions
```
All transactions where the account is source or destination (including its
opening-balance transaction), newest first.

Response `200`:
```json
{
  "account_id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c",
  "transactions": [
    {
      "id": "9db0c0bb-07ee-4bfd-b46e-2fd3b617cc62",
      "amount": "200",
      "source_account_id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c",
      "destination_account_id": "b42a6150-f9e2-4d59-96a7-6d3aaebfa225",
      "status": "completed",
      "created_at": "2026-09-13T15:27:03.267Z"
    }
  ]
}
```
`404` if the account doesn't exist.

### Create a transaction (move money)

```
POST /api/transactions
```
Request:
```json
{
  "idempotency_key": "payment-123",
  "amount": 200,
  "source_account_id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c",
  "destination_account_id": "b42a6150-f9e2-4d59-96a7-6d3aaebfa225"
}
```
Validates: `idempotency_key` required; `amount > 0` with at most 2 decimal
places; both accounts must exist and differ; source must have sufficient
funds (checked under a row lock - see [Concurrency](#concurrency)).

Response `201` (new payment):
```json
{
  "id": "9db0c0bb-07ee-4bfd-b46e-2fd3b617cc62",
  "idempotency_key": "payment-123",
  "status": "completed",
  "amount": "200",
  "source_account_id": "14a923b6-20c0-4c0d-8af9-2929c6ab029c",
  "destination_account_id": "b42a6150-f9e2-4d59-96a7-6d3aaebfa225",
  "created_at": "2026-09-13T15:27:03.267Z"
}
```
Response `200` (same body, `idempotency_key` already used - see
[Idempotency](#idempotency)) instead of a duplicate.

Errors: `404 account_not_found`, `422 insufficient_funds`,
`400 validation_error`.

### Reconciliation

```
GET /api/admin/reconcile
```
Response `200`:
```json
{ "reconciled": true, "total_debits": "9230.00", "total_credits": "9230.00" }
```
`reconciled` is `false` if the two sides ever diverge - see
[Reconciliation](#reconciliation).
