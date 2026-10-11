import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, waitFor, within } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { SakeDetailPage } from './SakeDetailPage';
import { includeMyReview, resetSakeDetail, sakeDetailHandlers } from './SakeDetailPage.mock';

const meta = {
  component: SakeDetailPage,
  args: { sakeId: 3 },
  // ストアに残った前の story のセッションを捨ててから msw のモックを読ませる
  loaders: [refetchSession],
  beforeEach: [
    () => {
      resetSakeDetail();
    },
    ({ msw }) => {
      msw.use(...sessionHandlers.signedIn, ...sakeDetailHandlers.success);
    },
  ],
} satisfies Meta<typeof SakeDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: '八海山 純米大吟醸' })).toBeVisible();
    await expect(canvas.getByText('No.3 八海醸造')).toBeVisible();
    await expect(canvas.getByText('限定')).toBeVisible();

    // 自分はまだレビューしていないので投稿フォームが出る（セッションの取得を待つ）
    await expect(await canvas.findByRole('heading', { name: 'レビューを投稿' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: '投稿する' })).toBeVisible();

    // 他の人のレビューが見える（タグはフォームのボタンと紛らわしいので一覧の中に限定する）
    const reviews = canvas.getByRole('list');
    await expect(within(reviews).getByText('長岡 太郎')).toBeVisible();
    await expect(
      within(reviews).getByText('華やかで飲みやすい。最後にもう一度飲みたい。'),
    ).toBeVisible();
    await expect(within(reviews).getByText('甘口')).toBeVisible();
    await expect(within(reviews).getByText('淡麗')).toBeVisible();
  },
};

export const MyReviewExists: Story = {
  beforeEach: () => {
    includeMyReview();
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'あなたのレビュー' })).toBeVisible();
    // 既存の内容が入った状態で編集できる
    await expect(canvas.getByRole('radio', { name: '星4' })).toBeChecked();
    await expect(canvas.getByLabelText('コメント（任意）')).toHaveValue(
      '香りがしっかりしていて好み。',
    );
    await expect(canvas.getByRole('button', { name: '更新する' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'レビューを削除' })).toBeVisible();
  },
};

export const NoReviews: Story = {
  beforeEach: () => {
    resetSakeDetail([]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('未評価')).toBeVisible();
    await expect(
      canvas.getByText('まだレビューはありません。最初の 1 件を書いてみましょう。'),
    ).toBeVisible();
  },
};

export const SignedOut: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sessionHandlers.signedOut);
  },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });
    await expect(
      await canvas.findByText('レビューを投稿するにはサインインが必要です。'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: '投稿する' })).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sakeDetailHandlers.loading);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: '読み込み中' })).toBeVisible();
  },
};

export const NotFound: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sakeDetailHandlers.notFound);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('お酒が見つかりませんでした')).toBeVisible();
  },
};

export const PostReview: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: 'レビューを投稿' });

    await userEvent.click(canvas.getByRole('radio', { name: '星5' }));
    await userEvent.click(canvas.getByRole('button', { name: '辛口' }));
    await userEvent.type(canvas.getByLabelText('コメント（任意）'), 'キレがあって美味しい');
    await userEvent.click(canvas.getByRole('button', { name: '投稿する' }));

    // 投稿後は自分のレビューとして編集モードに切り替わる
    await expect(await canvas.findByRole('heading', { name: 'あなたのレビュー' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: '星5' })).toBeChecked();
    // 入力欄にも同じ文字列があるので、レビュー一覧の中にあることを確かめる
    await waitFor(() =>
      expect(within(canvas.getByRole('list')).getByText('キレがあって美味しい')).toBeVisible(),
    );
    await expect(canvas.getByText('みんなのレビュー（3）')).toBeVisible();
  },
};

export const ValidationError: Story = {
  play: async ({ canvas, userEvent }) => {
    const comment = await canvas.findByLabelText('コメント（任意）');

    // 評価を選ばずに送信するとエラーになる
    await userEvent.type(comment, '評価を忘れた');
    await userEvent.click(canvas.getByRole('button', { name: '投稿する' }));

    await expect(await canvas.findByText('評価を選んでください')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'レビューを投稿' })).toBeVisible();
  },
};

export const DeleteReview: Story = {
  beforeEach: () => {
    includeMyReview();
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: 'あなたのレビュー' });

    await userEvent.click(canvas.getByRole('button', { name: 'レビューを削除' }));

    await expect(await canvas.findByRole('heading', { name: 'レビューを投稿' })).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByText('香りがしっかりしていて好み。')).not.toBeInTheDocument(),
    );
  },
};
