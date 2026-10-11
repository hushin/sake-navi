import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, fn, waitFor } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { WelcomePage } from './WelcomePage';
import { updateUserHandlers } from './WelcomePage.mock';

const meta = {
  component: WelcomePage,
  args: { onSaved: fn() },
  // ストアに残った前の story のセッションを捨ててから msw のモックを読ませる
  loaders: [refetchSession],
  beforeEach: [
    ({ msw }) => {
      msw.use(...sessionHandlers.signedIn, ...updateUserHandlers.success);
    },
  ],
} satisfies Meta<typeof WelcomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('heading', { name: 'ニックネームを決める' })).toBeVisible();

    await userEvent.type(canvas.getByLabelText('ニックネーム'), 'はなこ');
    await userEvent.click(canvas.getByRole('button', { name: '保存する' }));

    // 保存できたらアプリ本体へ進む
    await waitFor(() => expect(args.onSaved).toHaveBeenCalled());
  },
};

/** すでにニックネームがある場合は変更用の表示になる */
export const AlreadySet: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sessionHandlers.signedInWithNickname);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'ニックネームを変更' })).toBeVisible();
    await expect(canvas.getByText('いまの表示名: はなこ')).toBeVisible();
  },
};

export const ValidationError: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: '保存する' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'ニックネームを入力してください',
    );
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

export const ServerError: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...updateUserHandlers.error);
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText('ニックネーム'), 'はなこ');
    await userEvent.click(canvas.getByRole('button', { name: '保存する' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'ニックネームを登録できませんでした',
    );
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};
