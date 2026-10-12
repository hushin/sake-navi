import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect } from 'storybook/test';
import { StarRating } from './star-rating';

const meta = {
  component: StarRating,
  args: { value: 4.25 },
} satisfies Meta<typeof StarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 整数はその数だけ塗る（4 は 4 つ、5 は 5 つ） */
export const Integer: Story = {
  args: { value: 5 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '評価 5 / 5' })).toBeVisible();
  },
};

/**
 * 端数はその割合だけ塗る（4.25 は 5 つ目の 1/4、4.75 は 3/4）。
 * 見た目は CSS なので、読み上げられる名前（0.25 刻みの値そのもの）で確認する。
 */
export const Fractional: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4 p-4">
      {[4.25, 4.5, 4.75].map((value) => (
        <StarRating key={value} {...args} value={value} size="lg" />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '評価 4.25 / 5' })).toBeVisible();
    await expect(canvas.getByRole('img', { name: '評価 4.5 / 5' })).toBeVisible();
    await expect(canvas.getByRole('img', { name: '評価 4.75 / 5' })).toBeVisible();
  },
};

/** 平均評価のような端数も 0.25 刻みに丸めて塗る（4.37 → 4.25） */
export const Average: Story = {
  args: { value: 4.37 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '評価 4.25 / 5' })).toBeVisible();
  },
};

/** 0 は未評価。塗った星は出さない */
export const Unrated: Story = {
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '評価 0 / 5' })).toBeVisible();
  },
};
