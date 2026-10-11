/**
 * アーカイブ用に D1 の中身を JSON へダンプする。
 *
 * Usage:
 *   node --experimental-strip-types scripts/archive-dump.ts          # 本番 D1（Cloudflare の認証が要る）
 *   node --experimental-strip-types scripts/archive-dump.ts --local  # ローカルの D1 で試す
 *
 * 出力は dist/archive/*.json（`dist` は gitignore 済み）。読むのは archive-generate.ts
 * だけなので、HTML に出すテーブルだけをダンプする（bookmarks はアーカイブに出さない）。
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const OUTPUT_DIR = join(process.cwd(), 'dist', 'archive');

/** `wrangler d1 execute --json` の出力（`[{ results, success, meta }]`） */
const dumpResultSchema = z.array(z.object({ results: z.array(z.unknown()).optional() }));

/** `--local` を付けるとローカル D1 を読む（既定は本番の `--remote`） */
const location = process.argv.includes('--local') ? '--local' : '--remote';

/**
 * `file` は HTML 生成側が読むファイル名。`user` だけは SQL の予約語と紛らわしいのと、
 * 読み手が複数形のほうを扱いやすいので users.json にする。
 * `created_at` はミリ秒 epoch なので、そのまま JSON に落ちる。
 */
const tables = [
  {
    table: 'user',
    file: 'users',
    query: 'SELECT id, name, nickname, created_at FROM "user" ORDER BY created_at',
  },
  { table: 'breweries', file: 'breweries', query: 'SELECT * FROM breweries ORDER BY id' },
  { table: 'sakes', file: 'sakes', query: 'SELECT * FROM sakes ORDER BY brewery_id, id' },
  {
    table: 'reviews',
    file: 'reviews',
    query: 'SELECT * FROM reviews ORDER BY created_at DESC, id DESC',
  },
  {
    table: 'brewery_notes',
    file: 'brewery_notes',
    query: 'SELECT * FROM brewery_notes ORDER BY created_at DESC, id DESC',
  },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

// 途中で失敗したときに古い JSON が残ると、新旧が混ざったダンプを生成側がそのまま
// 読んでしまう。先に消しておけば「ファイルが無い」で気づける。
for (const { file } of tables) {
  rmSync(join(OUTPUT_DIR, `${file}.json`), { force: true });
}

for (const { table, file, query } of tables) {
  console.log(`Dumping ${table}...`);

  // データベースは wrangler.json の binding 名（DB）で指定できる。
  // `--json` を付けると stdout が JSON だけになり、ログの混ざった出力を正規表現で
  // 切り出す必要がない（stderr は inherit して認証エラーなどを見せる）。
  const raw = execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'DB', location, '--json', '--command', query],
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
  );

  const [result] = dumpResultSchema.parse(JSON.parse(raw));
  const rows = result?.results ?? [];

  const outPath = join(OUTPUT_DIR, `${file}.json`);
  writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`  → ${outPath} (${rows.length} rows)`);
}

console.log('\nDump complete!');
