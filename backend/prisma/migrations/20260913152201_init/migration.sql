-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('personal', 'business');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('completed', 'failed');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('debit', 'credit');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "source_account_id" TEXT NOT NULL,
    "destination_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
