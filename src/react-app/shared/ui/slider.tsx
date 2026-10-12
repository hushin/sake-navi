import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/react-app/shared/lib';

type SliderProps = SliderPrimitive.Root.Props & {
  /**
   * つまみ（Thumb）に渡す props。
   * 操作対象は Thumb の中の `input[type="range"]` なので、`aria-label` や
   * `getAriaValueText` などのアクセシビリティ属性は Root ではなくここに渡す。
   */
  thumbProps?: Omit<SliderPrimitive.Thumb.Props, 'className'>;
  /** 目盛り（メモリ）を出す値。トラックと同じ割合の位置に縦線を引く */
  marks?: readonly number[];
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbProps,
  marks,
  ...props
}: SliderProps) {
  // つまみの数は値の数。スカラー（range でない）なら 1 つ。
  // 生成されたコードは値が無いときに `[min, max]` へフォールバックしていて、
  // スカラーを渡しても 2 つ描画されてしまう（同じ input が 2 つできる）。
  const values = value ?? defaultValue;
  const thumbCount = Array.isArray(values) ? values.length : 1;

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      {/* py-2 でトラックの上下に余白を取り、トラック押下（つまみ以外をタップして値を合わせる）の
          当たり判定を広げる。touch-none なので広げすぎるとページのスクロールを邪魔する */}
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center py-2 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {marks?.map((mark) => (
          <span
            key={mark}
            aria-hidden="true"
            data-slot="slider-mark"
            // トラック（と塗り）の上に重ねる。つまみより先に置いて、つまみは目盛りの上に出す
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30"
            style={{ left: `${((mark - min) / (max - min)) * 100}%` }}
          />
        ))}
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            // size-5 のつまみに疑似要素で 12px 足して、指で押せる幅を 44px にする
            className="relative block size-5 shrink-0 rounded-full border border-ring bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-3 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
            {...thumbProps}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
