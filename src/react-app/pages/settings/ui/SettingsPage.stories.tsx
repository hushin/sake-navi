import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, waitFor } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { SettingsPage } from './SettingsPage';
import { membersHandlers, resetMembers } from './SettingsPage.mock';

const meta = {
  component: SettingsPage,
  // ストアに残った前の story のセッションを捨ててから msw のモックを読ませる
  loaders: [refetchSession],
  beforeEach: [
    () => {
      resetMembers();
    },
    ({ msw }) => {
      msw.use(...sessionHandlers.signedIn, ...membersHandlers.success);
    },
  ],
} satisfies Meta<typeof SettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Owner: Story = {
  play: async ({ canvas }) => {
    // セッションとメンバー一覧の両方が揃ってはじめてロールが出る
    await expect(await canvas.findByText('オーナーとしてサインイン中')).toBeVisible();
    await expect(canvas.getByText('taro@example.com')).toBeVisible();
    await expect(canvas.getByText('jiro@example.com')).toBeVisible();
    // オーナーは追加フォームと取り消しボタンを使える
    await expect(canvas.getByLabelText('Google アカウントのメールアドレス')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'jiro@example.com の招待を取り消す' }),
    ).toBeVisible();
  },
};

export const Member: Story = {
  beforeEach: () => {
    resetMembers({
      canManage: false,
      members: [
        {
          id: 'user-1',
          name: '新潟 花子',
          email: 'hanako@example.com',
          image: null,
          nickname: null,
          role: 'member',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('メンバーとしてサインイン中')).toBeVisible();
    await expect(canvas.getByText('メンバーの追加・削除はオーナーだけができます。')).toBeVisible();
    await expect(
      canvas.queryByLabelText('Google アカウントのメールアドレス'),
    ).not.toBeInTheDocument();
  },
};

export const AddInvitation: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = await canvas.findByLabelText('Google アカウントのメールアドレス');

    await userEvent.type(input, 'sato@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '追加' }));

    await expect(await canvas.findByText('sato@example.com')).toBeVisible();
    // 追加に成功したら入力欄は空になる
    await waitFor(() => expect(input).toHaveValue(''));
  },
};

export const DuplicateInvitation: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = await canvas.findByLabelText('Google アカウントのメールアドレス');

    await userEvent.type(input, 'jiro@example.com');
    await userEvent.click(canvas.getByRole('button', { name: '追加' }));

    await expect(await canvas.findByText('このアカウントはすでに追加されています')).toBeVisible();
  },
};

export const InvalidEmail: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = await canvas.findByLabelText('Google アカウントのメールアドレス');

    await userEvent.type(input, 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: '追加' }));

    await expect(await canvas.findByText('メールアドレスを入力してください')).toBeVisible();
  },
};

export const RemoveInvitation: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'jiro@example.com の招待を取り消す' }),
    );

    await waitFor(() => expect(canvas.queryByText('jiro@example.com')).not.toBeInTheDocument());
  },
};

export const FetchError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...membersHandlers.error);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('メンバーを取得できませんでした')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeVisible();
  },
};
