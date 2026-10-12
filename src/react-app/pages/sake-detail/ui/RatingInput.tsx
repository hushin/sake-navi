import { useId } from 'react';
import { Slider } from '@/react-app/shared/ui';
import { formatRating, RATING_MAX, RATING_MIN, RATING_STEP } from '@/shared/schemas/sake';

/** 未入力。`RatingInput` の value と `ReviewFormValues.rating` で同じ約束 */
const UNSET = 0;

/** 目盛りは 1 刻み（入力の刻みは `RATING_STEP` = 0.25） */
const RATING_MARKS = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_, index) => RATING_MIN + index,
);

/**
 * 評価の入力。スライダー（0.25 刻み）と、その下の 1 刻みの目盛り・数値だけで構成する。
 * 星は一覧側の表示に任せる（入力では 0.25 の差が読み取れず、目盛りにならないため）。
 * 動かすまで値を入れない（送信時の「評価を選んでください」を残すため）。
 */
export function RatingInput({
  value,
  onChange,
}: {
  /** 0 は未入力。それ以外は 1〜5 を 0.25 刻みで */
  value: number;
  onChange: (rating: number) => void;
}) {
  const labelId = useId();
  const hasValue = value > UNSET;
  // スライダーは空の状態を持てないので、未入力のときは左端（1.0）に置いておく
  const shown = hasValue ? value : RATING_MIN;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        {/* スライダーの名前は Thumb の `aria-labelledby` でしか付けられないので、span を参照する */}
        <span id={labelId} className="text-sm font-medium">
          評価
        </span>
        <span className="text-sm font-medium tabular-nums">
          {hasValue ? formatRating(value) : '—'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Slider
          value={shown}
          min={RATING_MIN}
          max={RATING_MAX}
          step={RATING_STEP}
          // ←→ は 0.25、PageUp / PageDown と Shift + 矢印は 1.0 刻み
          largeStep={1}
          marks={RATING_MARKS}
          // つまみの中心を目盛りの位置に合わせる（edge だと端で半歩ずれる）
          thumbAlignment="center"
          onValueChange={(next) =>
            onChange(typeof next === 'number' ? next : (next[0] ?? RATING_MIN))
          }
          thumbProps={{
            'aria-labelledby': labelId,
            getAriaValueText: (_formatted, current) =>
              hasValue ? `${formatRating(current)} / ${RATING_MAX}` : '未選択',
          }}
          // 星と同じ色にする（既定はテーマの primary）
          className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-range]]:bg-amber-400 [&_[data-slot=slider-thumb]]:border-amber-500"
        />

        {/* 目盛りのラベル。端（1 と 5）も目盛りを兼ねる。
            読み上げはスライダーの `aria-valuetext`（`4.25 / 5`）が伝えるので、ここは装飾扱い */}
        <div
          aria-hidden="true"
          className="flex justify-between text-xs tabular-nums text-muted-foreground"
        >
          {RATING_MARKS.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
