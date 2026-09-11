require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  console.log(JSON.stringify({
    host: url.hostname, port: url.port || '5432',
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get('schema') || 'public',
  }, null, 2));
  const directory = path.join(__dirname, '../prisma/migrations');
  console.log('Repository migrations:');
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name, 'migration.sql');
    if (fs.existsSync(file)) console.log(name + ' ' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  }
  if (!process.argv.includes('--connect')) return; // Offline by default.
  const prisma = new PrismaClient({ log: [] });
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const identity = await tx.$queryRawUnsafe('SELECT current_database() AS database, current_schema() AS schema, inet_server_addr()::text AS server_address, inet_server_port() AS server_port');
      const [historyTable] = await tx.$queryRawUnsafe('SELECT to_regclass(\'"_prisma_migrations"\')::text AS name');
      const history = historyTable.name ? await tx.$queryRawUnsafe('SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at') : 'Missing migration history: stop and review baselining';
      const columns = await tx.$queryRawUnsafe("SELECT table_schema,table_name,column_name,data_type,numeric_precision,numeric_scale,is_nullable,column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name IN ('categories','investments') ORDER BY table_name,ordinal_position");
      const indexes = await tx.$queryRawUnsafe("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename IN ('categories','investments') ORDER BY tablename,indexname");
      const constraints = await tx.$queryRawUnsafe("SELECT c.relname AS table_name, con.conname AS name, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname IN ('categories','investments') ORDER BY c.relname,con.conname");
      return { identity, history, columns, indexes, constraints };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(() => {
  console.error('Inspection failed. Verify the environment and database access privately; connection details are not printed.');
  process.exitCode = 1;
});
