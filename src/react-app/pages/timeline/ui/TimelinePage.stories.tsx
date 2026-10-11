import type { Meta, StoryObj } from '@storybook/tanstack-react';
import MockDate from 'mockdate';
import { expect, waitFor } from 'storybook/test';
import { TimelinePage } from './TimelinePage';
import { resetTimeline, TIMELINE_NOW, timelineHandlers } from './TimelinePage.mock';

const meta = {
  component: TimelinePage,
  beforeEach: [
    () => {
      resetTimeline();
      MockDate.set(TIMELINE_NOW);
      return () => {
        MockDate.reset();
      };
    },
    ({ msw }) => {
      msw.use(...timelineHandlers.success);
    },
  ],
} satisfies Meta<typeof TimelinePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('新潟 花子')).toBeVisible();
    await expect(canvas.getByText('八海山 純米大吟醸')).toBeVisible();
    await expect(canvas.getByText('No.3 八海醸造')).toBeVisible();
    // 固定時刻から 5 分前
    await expect(canvas.getByText('5分前')).toBeVisible();
    await expect(canvas.getByText('1時間前')).toBeVisible();
    await expect(canvas.getByText('華やかで飲みやすい。')).toBeVisible();

    // 1 ページ 2 件なので 3 件目はまだ出ていない
    await expect(canvas.queryByText('杜氏の挑戦 シャルドネ')).not.toBeInTheDocument();
  },
};

export const LoadMore: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('八海山 純米大吟醸');

    await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }));

    await expect(await canvas.findByText('杜氏の挑戦 シャルドネ')).toBeVisible();
    await expect(canvas.getByText('1日前')).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'もっと見る' })).not.toBeInTheDocument(),
    );
  },
};

export const LinkToSake: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: '八海山 純米大吟醸' })).toHaveAttribute(
      'href',
      '/sakes/3',
    );
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetTimeline([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('まだレビューがありません')).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...timelineHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...timelineHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('タイムラインを読み込めませんでした')).toBeVisible();
  },
};
