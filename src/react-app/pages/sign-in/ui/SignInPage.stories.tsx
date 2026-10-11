import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect } from 'storybook/test';
import { SignInPage } from './SignInPage';

const meta = {
  component: SignInPage,
} satisfies Meta<typeof SignInPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'サインイン' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Google でサインイン' })).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const AccessDenied: Story = {
  args: { error: 'access_denied' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        'この Google アカウントには利用が許可されていません。オーナーに追加を依頼してください。',
      ),
    ).toBeVisible();
  },
};

export const UnknownError: Story = {
  args: { error: 'invalid_code' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('サインインに失敗しました。もう一度お試しください。'),
    ).toBeVisible();
  },
};
