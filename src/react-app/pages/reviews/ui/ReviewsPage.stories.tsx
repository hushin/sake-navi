import type { Meta, StoryObj } from '@storybook/tanstack-react';
import MockDate from 'mockdate';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { ReviewsPage, type ReviewListSearch } from './ReviewsPage';
import { resetReviewFeed, reviewListHandlers } from './ReviewsPage.mock';

/** 相対時刻を安定させるための固定時刻（JST 2026-10-11 16:00） */
const NOW = '2026-10-11T07:00:00.000Z';

/** URL の代わりに state で検索条件を持つラッパー（実アプリでは route が URL と同期させる） */
function ReviewsPageWithState(props: React.ComponentProps<typeof ReviewsPage>) {
  const [search, setSearch] = useState<ReviewListSearch>(props.search);
  return <ReviewsPage search={search} onSearchChange={setSearch} />;
}

const meta = {
  component: ReviewsPage,
  args: {
    search: { sort: 'rating' },
    onSearchChange: fn(),
  },
  loaders: [refetchSession],
  beforeEach: [
    () => {
      resetReviewFeed();
      MockDate.set(NOW);
      return () => {
        MockDate.reset();
      };
    },
    ({ msw }) => {
      msw.use(...sessionHandlers.signedInWithNickname, ...reviewListHandlers.success);
    },
  ],
} satisfies Meta<typeof ReviewsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    // 評価順なので、評価 5 の 2 件が先に出る
    await expect(await canvas.findByRole('link', { name: '八海山 純米大吟醸' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: '杜氏の挑戦 シャルドネ' })).toBeVisible();
    await expect(canvas.getByText('No.3 八海醸造')).toBeVisible();
    await expect(canvas.getByText('1時間前')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '評価順' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 1 ページ 2 件なので、評価 4 の北雪はまだ出ていない
    await expect(canvas.queryByText('北雪 大吟醸YK35')).not.toBeInTheDocument();
  },
};

export const SortByLatest: Story = {
  render: (args) => <ReviewsPageWithState {...args} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '新着順' }));

    await expect(await canvas.findByRole('link', { name: '北雪 大吟醸YK35' })).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByText('杜氏の挑戦 シャルドネ')).not.toBeInTheDocument(),
    );
  },
};

export const FilterByTag: Story = {
  render: (args) => <ReviewsPageWithState {...args} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '甘口' }));

    // 甘口の 2 件（八海山・杜氏の挑戦）だけが残る
    await expect(await canvas.findByRole('link', { name: '杜氏の挑戦 シャルドネ' })).toBeVisible();
    await waitFor(() => expect(canvas.queryByText('北雪 大吟醸YK35')).not.toBeInTheDocument());
  },
};

export const FilterByMine: Story = {
  render: (args) => <ReviewsPageWithState {...args} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '自分のレビューだけ' }));

    // 自分（はなこ）の 2 件だけになる
    await expect(await canvas.findByRole('link', { name: '越乃寒梅 特別本醸造' })).toBeVisible();
    await expect(canvas.getAllByText('はなこ')).toHaveLength(2);
    await waitFor(() => expect(canvas.queryByText('北雪 大吟醸YK35')).not.toBeInTheDocument());
  },
};

export const LoadMore: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }));
    await expect(await canvas.findByRole('link', { name: '北雪 大吟醸YK35' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }));
    await expect(await canvas.findByRole('link', { name: '越乃寒梅 特別本醸造' })).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'もっと見る' })).not.toBeInTheDocument(),
    );
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetReviewFeed([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('まだレビューがありません')).toBeVisible();
  },
};

export const EmptyWithFilters: Story = {
  args: { search: { sort: 'rating', tags: '甘口' } },
  beforeEach: () => {
    resetReviewFeed([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('条件に合うレビューがありません')).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...reviewListHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...reviewListHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('レビューを読み込めませんでした')).toBeVisible();
  },
};
