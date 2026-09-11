CREATE TABLE "investments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "description" VARCHAR(255) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0),
  "date" DATE NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "investments_user_id_date_idx" ON "investments"("user_id", "date");
