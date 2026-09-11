-- Keep existing values when the column was added manually.
-- A DO statement is atomic: incompatible definitions fail without partial changes.
DO $migration$
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);

  ALTER TABLE "categories"
    ADD COLUMN IF NOT EXISTS "budget_limit" DECIMAL(12, 2);

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"categories"'::regclass
      AND attname = 'budget_limit'
      AND NOT attisdropped
      AND format_type(atttypid, atttypmod) = 'numeric(12,2)'
      AND NOT attnotnull
      AND NOT atthasdef
      AND attgenerated = ''
  ) THEN
    RAISE EXCEPTION 'categories.budget_limit must be nullable numeric(12,2) without a default; inspect schema drift before retrying';
  END IF;
END
$migration$;
