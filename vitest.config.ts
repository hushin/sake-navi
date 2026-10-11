import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defaultExclude, defineConfig } from 'vitest/config';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname;

// Node 側で migration SQL を読み、テスト用 Worker のバインディングとして渡す
const migrations = await readD1Migrations('./drizzle');

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.json',
      },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          // テストを .dev.vars に依存させない（CI には .dev.vars が無い）
          BETTER_AUTH_SECRET: 'test-secret',
          BETTER_AUTH_URL: 'http://localhost:5173',
          GOOGLE_CLIENT_ID: 'test-client-id',
          GOOGLE_CLIENT_SECRET: 'test-client-secret',
          ALLOWED_EMAILS: 'owner@example.com',
          // 通知は fetch をモックして確認する（送信先はテストで差し替えない）
          DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    // better-auth → @better-auth/core が使う @opentelemetry/semantic-conventions の
    // ESM ビルドは拡張子なしの相対 import（./trace）を含み、workerd のモジュール解決では
    // 引けない。Vite にバンドルさせて解決させる（pnpm-workspace.yaml の
    // publicHoistPattern とセットで必要）。
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['@opentelemetry/semantic-conventions'],
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          globals: true,
          // 各テストファイルの実行前に migration を適用する
          setupFiles: ['./src/worker/test/apply-migrations.ts'],
          // .wt は git worktree の置き場（別ブランチの作業ツリー）
          exclude: [...defaultExclude, '**/.wt/**'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
