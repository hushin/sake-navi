import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect } from 'storybook/test';
import { refetchSession, sessionHandlers } from '@/react-app/shared/lib';
import { Header } from './Header';

const meta = {
  component: Header,
  // ストアに残った前の story のセッションを捨ててから msw のモックを読ませる
  loaders: [refetchSession],
  beforeEach: [
    ({ msw }) => {
      msw.use(...sessionHandlers.signedIn);
    },
  ],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '酒ナビ' })).toHaveAttribute('href', '/sakes');
    await expect(canvas.getByRole('link', { name: 'お酒' })).toHaveAttribute('href', '/sakes');
    await expect(canvas.getByRole('link', { name: 'タイムライン' })).toHaveAttribute(
      'href',
      '/timeline',
    );
    await expect(canvas.getByRole('link', { name: 'ブックマーク' })).toHaveAttribute(
      'href',
      '/bookmarks',
    );
    await expect(await canvas.findByText('新潟 花子')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'サインアウト' })).toBeVisible();
  },
};

export const SignedOut: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...sessionHandlers.signedOut);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'サインイン' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(canvas.queryByRole('button', { name: 'サインアウト' })).not.toBeInTheDocument();
  },
};
