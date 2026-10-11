import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, waitFor, within } from 'storybook/test';
import {
  bookmarkFixtures,
  bookmarkHandlers,
  refetchSession,
  resetBookmarks,
  sessionHandlers,
} from '@/react-app/shared/lib';
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
      resetBookmarks([]);
    },
    ({ msw }) => {
      msw.use(
        ...sessionHandlers.signedIn,
        ...sakeDetailHandlers.success,
        ...bookmarkHandlers.success,
      );
    },
  ],
} satisfies Meta<typeof SakeDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: '八海山 純米大吟醸' })).toBeVisible();
    await expect(canvas.getByText('No.3')).toBeVisible();
    // 酒蔵名から酒蔵詳細（出品酒一覧）へ行ける
    await expect(canvas.getByRole('link', { name: '八海醸造' })).toHaveAttribute(
      'href',
      '/breweries/3',
    );
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
    // 編集では通知しないのでチェックを出さない
    await expect(canvas.queryByLabelText('Discord に通知する')).not.toBeInTheDocument();
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
    // 通知は既定 OFF。チェックを入れると投稿時に Discord へ流す
    await expect(canvas.getByLabelText('Discord に通知する')).not.toBeChecked();
    await userEvent.click(canvas.getByLabelText('Discord に通知する'));
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

export const EditSake: Story = {
  play: async ({ canvas, userEvent }) => {
    // 出典 PDF では金額が分からず「有料試飲」とだけ書かれていた状態
    await expect(await canvas.findByText('有料試飲（金額未確認）')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: '編集' }));

    // 「有料試飲あり」はチェック済みで、金額は空になっている
    await expect(await canvas.findByLabelText('有料試飲あり')).toBeChecked();
    await expect(canvas.getByLabelText('有料試飲の金額（円）')).toHaveValue('');

    const name = await canvas.findByLabelText('名前');
    await userEvent.clear(name);
    await userEvent.type(name, '八海山 純米大吟醸 生');
    await userEvent.type(canvas.getByLabelText('有料試飲の金額（円）'), '500');
    await userEvent.click(canvas.getByRole('button', { name: '保存' }));

    // 保存すると表示が新しい内容に変わる
    await expect(
      await canvas.findByRole('heading', { name: '八海山 純米大吟醸 生' }),
    ).toBeVisible();
    await expect(canvas.getByText('有料試飲 ¥500')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  },
};

export const EditSakeValidationError: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '編集' }));

    await userEvent.clear(await canvas.findByLabelText('名前'));
    await userEvent.type(canvas.getByLabelText('有料試飲の金額（円）'), '0');
    await userEvent.click(canvas.getByRole('button', { name: '保存' }));

    await expect(await canvas.findByText('お酒の名前を入力してください')).toBeVisible();
    await expect(canvas.getByText('1 以上の金額を入力してください')).toBeVisible();
  },
};

export const CancelEditSake: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '編集' }));
    await userEvent.clear(await canvas.findByLabelText('名前'));
    await userEvent.type(canvas.getByLabelText('名前'), '保存しない名前');
    await userEvent.click(canvas.getByRole('button', { name: 'キャンセル' }));

    await expect(canvas.getByRole('heading', { name: '八海山 純米大吟醸' })).toBeVisible();
    await expect(canvas.queryByText('保存しない名前')).not.toBeInTheDocument();
  },
};

export const ToggleBookmark: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    // まだ保存していないので「追加」が出る
    await userEvent.click(await canvas.findByRole('button', { name: 'ブックマークに追加' }));

    await expect(await canvas.findByRole('button', { name: 'ブックマークを解除' })).toBeVisible();

    // もう一度押すと解除できる
    await userEvent.click(canvas.getByRole('button', { name: 'ブックマークを解除' }));
    await expect(await canvas.findByRole('button', { name: 'ブックマークに追加' })).toBeVisible();
  },
};

export const Bookmarked: Story = {
  beforeEach: () => {
    resetBookmarks(bookmarkFixtures);
  },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    // 保存済みの銘柄（id 3）は「解除」の状態で出る
    await expect(await canvas.findByRole('button', { name: 'ブックマークを解除' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

/** 金額が分からないまま「有料試飲あり」だけ保存できる */
export const SaveUndeterminedPaidTasting: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '編集' }));
    await userEvent.click(await canvas.findByRole('button', { name: '保存' }));

    await expect(await canvas.findByText('有料試飲（金額未確認）')).toBeVisible();
  },
};

/** チェックを外すと有料試飲の表示が消える */
export const UncheckPaidTasting: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: '八海山 純米大吟醸' });

    await userEvent.click(canvas.getByRole('button', { name: '編集' }));
    await userEvent.click(await canvas.findByLabelText('有料試飲あり'));
    await userEvent.click(canvas.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(canvas.queryByText(/有料試飲/)).not.toBeInTheDocument());
  },
};
