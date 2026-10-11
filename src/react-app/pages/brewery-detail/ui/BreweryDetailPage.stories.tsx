import type { Meta, StoryObj } from '@storybook/tanstack-react';
import MockDate from 'mockdate';
import { expect, waitFor } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { BreweryDetailPage } from './BreweryDetailPage';
import { breweryDetailHandlers, resetBreweryDetail, sakeFixtures } from './BreweryDetailPage.mock';

/** 相対時刻を安定させるための固定時刻（JST 2026-10-11 16:00） */
const NOW = '2026-10-11T07:00:00.000Z';

const meta = {
  component: BreweryDetailPage,
  args: { breweryId: 3 },
  loaders: [refetchSession],
  beforeEach: [
    () => {
      resetBreweryDetail();
      MockDate.set(NOW);
      return () => {
        MockDate.reset();
      };
    },
    ({ msw }) => {
      msw.use(...sessionHandlers.signedInWithNickname, ...breweryDetailHandlers.success);
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

    // 酒蔵ノートは新しい順
    await expect(await canvas.findByText('酒蔵ノート（2）')).toBeVisible();
    await expect(canvas.getByText('列が長い。今なら空いている。')).toBeVisible();
    await expect(canvas.getByText('14 時時点で売り切れ。')).toBeVisible();
    await expect(canvas.getByText('はなこ')).toBeVisible();
  },
};

export const PostNote: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('酒蔵ノート（2）');

    await userEvent.type(canvas.getByLabelText('ノート'), '今は並ばずに入れる。');
    await userEvent.click(canvas.getByRole('button', { name: 'ノートを投稿' }));

    await expect(await canvas.findByText('今は並ばずに入れる。')).toBeVisible();
    await expect(canvas.getByText('酒蔵ノート（3）')).toBeVisible();
    // 投稿できたら入力欄は空に戻る
    await expect(canvas.getByLabelText('ノート')).toHaveValue('');
  },
};

export const EditNote: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('列が長い。今なら空いている。');

    // 自分のノートにだけ編集・削除が出る
    await userEvent.click(canvas.getByRole('button', { name: '編集' }));
    const textarea = canvas.getAllByLabelText('ノート')[1];
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '列は短くなった。');
    await userEvent.click(canvas.getByRole('button', { name: '更新する' }));

    await expect(await canvas.findByText('列は短くなった。')).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByText('列が長い。今なら空いている。')).not.toBeInTheDocument(),
    );
  },
};

export const DeleteNote: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('列が長い。今なら空いている。');

    await userEvent.click(canvas.getByRole('button', { name: '削除' }));

    await waitFor(() =>
      expect(canvas.queryByText('列が長い。今なら空いている。')).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText('酒蔵ノート（1）')).toBeVisible();
  },
};

export const NotesEmpty: Story = {
  beforeEach: () => {
    resetBreweryDetail(sakeFixtures, []);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('まだノートがありません')).toBeVisible();
  },
};

export const SignedOut: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sessionHandlers.signedOut);
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('ノートを投稿するにはサインインが必要です。'),
    ).toBeVisible();
    // 自分のノートが無いので、編集・削除も出ない
    await expect(canvas.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetBreweryDetail([], []);
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
