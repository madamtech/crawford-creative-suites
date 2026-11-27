// Local test database: real Postgres (PGlite) + Supabase stand-ins + our migrations.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');

export async function openDb({ seed = false, dataDir } = {}) {
  const db = new PGlite(dataDir);
  await db.exec(read('tests/supabase-stubs.sql'));
  for (const f of readdirSync(new URL('migrations/', dir)).filter((f) => f.endsWith('.sql')).sort()) {
    try { await db.exec(read(`migrations/${f}`)); } catch (e) { throw new Error(`${f}: ${e.message}`); }
  }
  if (seed) await db.exec(read('seed.sql'));

  let queue = Promise.resolve();
  // Run fn(tx) as a Supabase role, the way PostgREST does for each request.
  db.as = (role, claims, fn) => {
    const run = queue.then(async () => {
      await db.exec('begin');
      try {
        await db.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`,
          [role, JSON.stringify({ role, ...(claims || {}) })]);
        const out = await fn(db);
        await db.exec('commit');
        return out;
      } catch (e) {
        await db.exec('rollback');
        throw e;
      }
    });
    queue = run.catch(() => {});
    return run;
  };
  return db;
}
