import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect } from 'storybook/test';
import { PaidTastingBadge } from './paid-tasting-badge';

const meta = {
  component: PaidTastingBadge,
} satisfies Meta<typeof PaidTastingBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 金額が分かっている */
export const Priced: Story = {
  args: { price: 500 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('有料試飲 ¥500')).toBeVisible();
  },
};

/** PDF に「有料試飲」とだけ書かれていたもの（7 が入っている） */
export const Undetermined: Story = {
  args: { price: 7 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('有料試飲（金額未確認）')).toBeVisible();
    await expect(canvas.queryByText(/¥7/)).not.toBeInTheDocument();
  },
};

/** 有料試飲ではない */
export const NotPaid: Story = {
  args: { price: null },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/有料試飲/)).not.toBeInTheDocument();
  },
};
