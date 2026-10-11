import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, waitFor } from 'storybook/test';
import { bookmarkHandlers, resetBookmarks } from '@/react-app/shared/lib';
import { BookmarksPage } from './BookmarksPage';

const meta = {
  component: BookmarksPage,
  beforeEach: [
    () => {
      resetBookmarks();
    },
    ({ msw }) => {
      msw.use(...bookmarkHandlers.success);
    },
  ],
} satisfies Meta<typeof BookmarksPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: '八海山 純米大吟醸' })).toBeVisible();
    await expect(canvas.getByText('No.3 八海醸造')).toBeVisible();
    await expect(canvas.getByText('有料 ¥500')).toBeVisible();

    await expect(canvas.getByRole('link', { name: '北雪 大吟醸YK35' })).toBeVisible();
    await expect(canvas.getByText('No.82 北雪酒造')).toBeVisible();
    await expect(canvas.getByText('限定')).toBeVisible();
  },
};

/** ブックマーク画面の項目は常に保存済みなので、ここでのトグルは「解除」になる */
export const RemoveBookmark: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getAllByRole('button', { name: 'ブックマークを解除' })[0]);

    await waitFor(() =>
      expect(canvas.queryByRole('link', { name: '八海山 純米大吟醸' })).not.toBeInTheDocument(),
    );
    // 消したのは 1 件だけで、もう 1 件は残る
    await expect(canvas.getByRole('link', { name: '北雪 大吟醸YK35' })).toBeVisible();
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetBookmarks([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ブックマークはまだありません')).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...bookmarkHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...bookmarkHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ブックマークを読み込めませんでした')).toBeVisible();
  },
};
