CREATE TYPE "PaymentMethod" AS ENUM ('DEBIT', 'CREDIT');

ALTER TABLE "transactions" ADD COLUMN "payment_method" "PaymentMethod";
