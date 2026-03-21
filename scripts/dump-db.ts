/**
 * D1データベースからデータをダンプするスクリプト
 * Usage: node --experimental-strip-types scripts/dump-db.ts
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'dist', 'archive');
const DB_NAME = 'sake-navi-db';

const tables = [
  { name: 'users', query: 'SELECT * FROM users ORDER BY created_at' },
  { name: 'breweries', query: 'SELECT * FROM breweries ORDER BY brewery_id' },
  { name: 'sakes', query: 'SELECT * FROM sakes ORDER BY brewery_id, sake_id' },
  { name: 'reviews', query: 'SELECT * FROM reviews ORDER BY created_at DESC' },
  {
    name: 'brewery_notes',
    query: 'SELECT * FROM brewery_notes ORDER BY created_at DESC',
  },
  {
    name: 'bookmarks',
    query: 'SELECT * FROM bookmarks ORDER BY created_at DESC',
  },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const table of tables) {
  console.log(`Dumping ${table.name}...`);
  const raw = execSync(
    `pnpm wrangler d1 execute ${DB_NAME} --remote --command "${table.query}"`,
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
  );
  // wrangler outputs logs to stderr, JSON array to stdout
  // Extract the JSON array from the output
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error(`  Failed to parse output for ${table.name}`);
    console.error(raw);
    process.exit(1);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const results = parsed[0]?.results ?? [];
  const outPath = join(OUTPUT_DIR, `${table.name}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`  → ${outPath} (${results.length} rows)`);
}

console.log('\nDump complete!');
