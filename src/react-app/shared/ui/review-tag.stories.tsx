import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { expect, fn } from 'storybook/test';
import { REVIEW_TAGS } from '@/shared/schemas/sake';
import { TagBadge, TagToggle } from './review-tag';

const meta = {
  component: TagToggle,
  args: {
    tag: '甘口',
    isSelected: false,
    onClick: fn(),
  },
} satisfies Meta<typeof TagToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 選択状態は呼び出し側が持つ（押したら切り替えを伝える） */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '甘口' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** 選択中は塗りつぶして、色だけに頼らず面でも違いが分かる */
export const Selected: Story = {
  args: { isSelected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '甘口' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

/** 全タグの色（バッジ・未選択・選択中）を並べて確認する */
export const Palette: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((tag) => (
          <TagToggle key={tag} tag={tag} isSelected={false} onClick={args.onClick} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((tag) => (
          <TagToggle key={tag} tag={tag} isSelected onClick={args.onClick} />
        ))}
      </div>
    </div>
  ),
};
