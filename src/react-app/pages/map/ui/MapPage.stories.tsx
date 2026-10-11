import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, within } from 'storybook/test';
import { MapPage } from './MapPage';
import { mapHandlers } from './MapPage.mock';

const meta = {
  component: MapPage,
  args: {},
  beforeEach: [
    ({ msw }) => {
      msw.use(...mapHandlers.success);
    },
  ],
} satisfies Meta<typeof MapPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    // 酒蔵名と平均評価がバッジに出る（バッジは酒蔵詳細へのリンク）
    const northSnow = await canvas.findByRole('link', { name: /北雪酒造/ });
    await expect(within(northSnow).getByText('4.5')).toBeVisible();
    await expect(northSnow).toHaveAttribute('href', '/breweries/82');

    // 未評価の酒蔵は「未評価」
    const sekihara = canvas.getByRole('link', { name: /関原酒造/ });
    await expect(within(sekihara).getByText('未評価')).toBeVisible();

    // 凡例
    await expect(canvas.getByText('レビュー済み')).toBeVisible();
    await expect(canvas.getByText('未レビュー')).toBeVisible();
  },
};

export const Focused: Story = {
  args: { breweryId: 1 },
  play: async ({ canvas }) => {
    // 指定した酒蔵だけが「表示中」になる
    const sekihara = await canvas.findByRole('link', { name: /関原酒造/ });
    await expect(sekihara).toHaveAttribute('aria-current', 'true');
    await expect(canvas.getByRole('link', { name: /北雪酒造/ })).not.toHaveAttribute(
      'aria-current',
    );

    // 強調を解除できる
    await expect(canvas.getByRole('link', { name: '強調を解除' })).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...mapHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...mapHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('マップを読み込めませんでした')).toBeVisible();
  },
};
