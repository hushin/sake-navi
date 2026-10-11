import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { SakeListPage } from './SakeListPage';
import { resetSakes, sakeListHandlers } from './SakeListPage.mock';

/** URL の代わりに state で検索条件を持つラッパー（実アプリでは route が URL と同期させる） */
function SakeListPageWithState(props: React.ComponentProps<typeof SakeListPage>) {
  const [search, setSearch] = useState(props.search);
  // route と同じく、URL（ここでは state）の q が変わったら入力欄を作り直す
  return <SakeListPage key={search.q} search={search} onSearchChange={setSearch} />;
}

const meta = {
  component: SakeListPage,
  args: {
    search: { q: '', category: '' },
    onSearchChange: fn(),
  },
  beforeEach: [
    () => {
      resetSakes();
    },
    ({ msw }) => {
      msw.use(...sakeListHandlers.success);
    },
  ],
} satisfies Meta<typeof SakeListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('八海山 純米大吟醸')).toBeVisible();
    await expect(canvas.getByText('No.3 八海醸造')).toBeVisible();
    // 平均評価があるものは星と数値が出る
    await expect(canvas.getByLabelText('評価 5 / 5')).toBeVisible();
    await expect(canvas.getByText('北雪 大吟醸YK35')).toBeVisible();
    // 未評価のものは「未評価」
    await expect(canvas.getByText('未評価')).toBeVisible();
    await expect(canvas.getByText('限定')).toBeVisible();
    // 1 ページ 2 件なので 3 件目はまだ出ていない
    await expect(canvas.queryByText('杜氏の挑戦 シャルドネ')).not.toBeInTheDocument();
  },
};

export const LoadMore: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('八海山 純米大吟醸');

    await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }));

    await expect(await canvas.findByText('杜氏の挑戦 シャルドネ')).toBeVisible();
    // 最後まで読んだらボタンは消える
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'もっと見る' })).not.toBeInTheDocument(),
    );
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetSakes([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('該当するお酒がありません')).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sakeListHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sakeListHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('お酒の一覧を読み込めませんでした')).toBeVisible();
  },
};

export const SearchByName: Story = {
  render: (args) => <SakeListPageWithState {...args} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('八海山 純米大吟醸');

    await userEvent.type(canvas.getByLabelText('酒名・酒蔵名で検索'), '北雪');
    await userEvent.click(canvas.getByRole('button', { name: '検索' }));

    await expect(await canvas.findByText('北雪 大吟醸YK35')).toBeVisible();
    await waitFor(() => expect(canvas.queryByText('八海山 純米大吟醸')).not.toBeInTheDocument());
  },
};

export const FilterByCategory: Story = {
  render: (args) => <SakeListPageWithState {...args} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('八海山 純米大吟醸');

    await userEvent.click(canvas.getByRole('button', { name: 'リキュール' }));

    await expect(await canvas.findByText('杜氏の挑戦 シャルドネ')).toBeVisible();
    await waitFor(() => expect(canvas.queryByText('八海山 純米大吟醸')).not.toBeInTheDocument());
  },
};
