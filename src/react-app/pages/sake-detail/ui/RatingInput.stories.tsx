import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { RatingInput } from './RatingInput';

/** 実アプリでは TanStack Form の field が値を持つ。story では useState で同じ動きを作る */
function RatingInputWithState({
  value: initialValue,
  onChange,
}: React.ComponentProps<typeof RatingInput>) {
  const [value, setValue] = useState(initialValue);

  return (
    <RatingInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const meta = {
  component: RatingInput,
  args: { value: 0, onChange: fn() },
  render: (args) => <RatingInputWithState {...args} />,
} satisfies Meta<typeof RatingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 未入力は 0 のまま。つまみは左端（1.0）に置き、右の数値の代わりに「—」を出す。
 * 星は一覧側の表示なので、入力には持たない。
 */
export const Unrated: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', { name: '評価' });
    await expect(slider).toHaveValue('1');
    await expect(slider).toHaveAttribute('aria-valuetext', '未選択');
    await expect(canvas.getByText('—')).toBeVisible();
    // 目盛りは 1 刻みで 1〜5（端の 1 と 5 もラベルを兼ねる）
    for (const mark of [1, 2, 3, 4, 5]) {
      await expect(canvas.getByText(String(mark))).toBeVisible();
    }
  },
};

/** 未入力から → を 1 回押すと 0.25 上がる（つまみは 1.0 から 1.25 へ） */
export const SelectByKeyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const slider = canvas.getByRole('slider', { name: '評価' });
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(slider).toHaveValue('1.25');
    await expect(slider).toHaveAttribute('aria-valuetext', '1.25 / 5');
    // 数値が「—」から 0.25 刻みの値に変わる（目盛りのラベルと重複しないので text でも取れる）
    await expect(canvas.getByText('1.25')).toBeVisible();
    await expect(args.onChange).toHaveBeenLastCalledWith(1.25);
  },
};

/** PageUp / PageDown と Shift + ←→ は 1.0 刻みで動く（1 刻みの目盛りの上を移動する） */
export const LargeStep: Story = {
  play: async ({ canvas, userEvent }) => {
    const slider = canvas.getByRole('slider', { name: '評価' });
    slider.focus();

    // 2 や 3 は目盛りのラベルにも出るので、数値表示は text ではなくスライダーの値で見る
    await userEvent.keyboard('{PageUp}');
    await expect(slider).toHaveValue('2');
    await expect(slider).toHaveAttribute('aria-valuetext', '2 / 5');

    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await expect(slider).toHaveValue('3');
    await expect(slider).toHaveAttribute('aria-valuetext', '3 / 5');
  },
};

/** 保存済みの評価から始めて、下げる方向にも 0.25 刻みで動く */
export const PresetValue: Story = {
  args: { value: 4.25 },
  play: async ({ canvas, userEvent }) => {
    const slider = canvas.getByRole('slider', { name: '評価' });
    await expect(slider).toHaveValue('4.25');
    await expect(slider).toHaveAttribute('aria-valuetext', '4.25 / 5');
    await expect(canvas.getByText('4.25')).toBeVisible();

    slider.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(slider).toHaveValue('4');
    await expect(slider).toHaveAttribute('aria-valuetext', '4 / 5');
  },
};
