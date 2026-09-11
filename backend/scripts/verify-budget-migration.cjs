// Explicit integration check; never runs as part of npm test.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Local verification requires a loopback PostgreSQL host.');
}
const prisma = new PrismaClient({ log: [] });
const read = name => fs.readFileSync(path.join(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8');
const initial = read('20260803175917_npm_run_prisma_seed');
const investments = read('20260911000000_add_investments');
const repair = read('20260911180000_add_category_budget_limit');
const rollback = new Error('rollback verification fixtures');

async function scenario(existing) {
  const schema = 'verify_budget_' + process.pid + '_' + existing;
  let verified = false;
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "' + schema + '"');
      for (const statement of initial.split(';').filter(s => s.trim())) {
        await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRawUnsafe("INSERT INTO users (id,name,email,password_hash,updated_at) VALUES ('u','Test','test@example.invalid','unused',NOW())");
      await tx.$executeRawUnsafe("INSERT INTO categories (id,name,color,user_id) VALUES ('c','Test','#123456','u')");
      if (existing === 'compatible') {
        await tx.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN budget_limit DECIMAL(12,2)');
        await tx.$executeRawUnsafe('UPDATE categories SET budget_limit = 123.45');
      }
      if (existing === 'incompatible') {
        await tx.$executeRawUnsafe('ALTER TABLE categories ADD COLUMN budget_limit TEXT');
      }
      for (const statement of investments.split(';').filter(s => s.trim())) {
        await tx.$executeRawUnsafe(statement);
      }
      if (existing === 'incompatible') {
        await tx.$executeRawUnsafe(repair); // Must fail, rolling back the entire fixture.
        throw new Error('Incompatible column was incorrectly accepted');
      }
      await tx.$executeRawUnsafe(repair);
      await tx.$executeRawUnsafe(repair); // Repeat execution must preserve data.
      const [row] = await tx.$queryRawUnsafe('SELECT id, budget_limit::text AS budget FROM categories');
      assert.deepEqual(row, { id: 'c', budget: existing === 'compatible' ? '123.45' : null });
      await tx.$executeRawUnsafe("INSERT INTO investments (id,description,amount,date,user_id,updated_at) VALUES ('i','Test',10.25,'2026-09-11','u',NOW())");
      const [investment] = await tx.$queryRawUnsafe("SELECT amount::text AS amount FROM investments WHERE id='i'");
      assert.equal(investment.amount, '10.25');
      const constraints = await tx.$queryRawUnsafe("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'investments'::regclass");
      assert(constraints.some(c => c.definition.includes('CHECK') && c.definition.includes('amount')));
      assert(constraints.some(c => c.definition.includes('FOREIGN KEY (user_id)') && c.definition.includes('ON DELETE CASCADE')));
      const indexes = await tx.$queryRawUnsafe("SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename='investments'");
      assert(indexes.some(i => i.indexdef.includes('(user_id, date)')));
      verified = true;
      throw rollback; // No test schema or fixture is committed.
    }, { timeout: 30000 });
  } catch (error) {
    if (error === rollback && verified) return;
    if (existing === 'incompatible' && String(error.message).includes('must be nullable numeric')) return;
    throw error;
  }
  throw new Error('Verification did not roll back');
}

(async () => {
  for (const existing of ['absent', 'compatible', 'incompatible']) {
    await scenario(existing);
    console.log('PASS: ' + existing + ' column; fixtures rolled back');
  }
})().catch(() => {
  console.error('FAIL: local migration verification. Inspect the local database configuration and migration definitions.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
