import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect } from 'storybook/test';
import { BreweryDetailPage } from './BreweryDetailPage';
import { breweryDetailHandlers, resetBreweryDetail } from './BreweryDetailPage.mock';

const meta = {
  component: BreweryDetailPage,
  args: { breweryId: 3 },
  beforeEach: [
    () => {
      resetBreweryDetail();
    },
    ({ msw }) => {
      msw.use(...breweryDetailHandlers.success);
    },
  ],
} satisfies Meta<typeof BreweryDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: '八海醸造' })).toBeVisible();
    await expect(canvas.getByText('No.3')).toBeVisible();
    await expect(canvas.getByText('Lower Green')).toBeVisible();
    await expect(canvas.getByText('出品酒（3）')).toBeVisible();

    // 出品酒と評価
    await expect(canvas.getByRole('link', { name: /八海山 純米大吟醸/ })).toBeVisible();
    await expect(canvas.getByText('4.5')).toBeVisible();
    await expect(canvas.getByText('レビュー済み')).toBeVisible();
    await expect(canvas.getByText('未評価')).toBeVisible();
    await expect(canvas.getByText('限定')).toBeVisible();

    // マップへ戻れる（酒蔵を強調した状態で開く）
    await expect(canvas.getByRole('link', { name: 'マップで見る' })).toHaveAttribute(
      'href',
      '/map?brewery=3',
    );
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetBreweryDetail([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: '八海醸造' })).toBeVisible();
    await expect(canvas.getByText('出品酒がまだ登録されていません')).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...breweryDetailHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const NotFound: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...breweryDetailHandlers.notFound);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('酒蔵が見つかりませんでした')).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...breweryDetailHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('酒蔵の情報を取得できませんでした')).toBeVisible();
  },
};
