import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, fn } from 'storybook/test';
import { BookmarkButton } from './bookmark-button';

const meta = {
  component: BookmarkButton,
  args: {
    isBookmarked: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof BookmarkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'ブックマークに追加' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};

export const Bookmarked: Story = {
  args: { isBookmarked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'ブックマークを解除' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const Pending: Story = {
  args: { isPending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'ブックマークに追加' })).toBeDisabled();
  },
};
