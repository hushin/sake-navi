import { revalidateLogic, useForm } from '@tanstack/react-form';
import { Button, Input, Label } from '@/react-app/shared/ui';
import {
  SAKE_CATEGORIES,
  SAKE_NAME_MAX_LENGTH,
  SAKE_PAID_TASTING_PRICE_MAX,
  SAKE_TYPE_MAX_LENGTH,
  sakeEditSchema,
  toSakeEditInput,
  toSakeUpdateInput,
  type SakeEditInput,
  type SakeUpdateInput,
} from '@/shared/schemas/sake';

function getErrorMessage(error: unknown): string {
  if (error != null && typeof error === 'object' && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '';
}

type SakeForEdit = {
  name: string;
  type: string | null;
  category: string;
  isLimited: boolean;
  paidTastingPrice: number | null;
};

/** 新規追加の初期値（酒蔵詳細の「酒を追加」で使う） */
const emptySakeEditInput: SakeEditInput = {
  name: '',
  type: '',
  category: '清酒',
  isLimited: false,
  hasPaidTasting: false,
  paidTastingPrice: '',
};

/**
 * 銘柄の編集と新規追加を兼ねる。身内で使うアプリなので、サインインしていれば誰でも使える。
 *
 * 有料試飲は「あり／なし」と金額を分けて入力する。出典 PDF では金額が分からないものに
 * 印として `7` が入っているので、チェックだけ入れて金額を空にするとその状態（金額未確認）を保つ。
 */
export function SakeForm({
  sake,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  /** 編集する銘柄。省略すると新規追加になる */
  sake?: SakeForEdit;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (input: SakeUpdateInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const form = useForm({
    defaultValues: sake ? toSakeEditInput(sake) : emptySakeEditInput,
    // 送信するまでは検証しない。名前を入れる前に「限定品」や「有料試飲あり」を押しただけで
    // 「お酒の名前を入力してください」が出てしまうのを防ぐ（送信後は直したそばから検証する）。
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: sakeEditSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(toSakeUpdateInput(value));
    },
  });

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');
          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sake-name">名前</Label>
              <Input
                id="sake-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                maxLength={SAKE_NAME_MAX_LENGTH}
                placeholder="当日の限定酒など"
                aria-invalid={error.length > 0 || undefined}
              />
              {error.length > 0 && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="type">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');
          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sake-type">種類（任意）</Label>
              <Input
                id="sake-type"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                maxLength={SAKE_TYPE_MAX_LENGTH}
                placeholder="純米大吟醸"
                aria-invalid={error.length > 0 || undefined}
              />
              {error.length > 0 && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="category">
        {(field) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">区分</legend>
            <div className="flex flex-wrap gap-1.5">
              {SAKE_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={field.state.value === category ? 'default' : 'outline'}
                  aria-pressed={field.state.value === category}
                  onClick={() => field.handleChange(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </fieldset>
        )}
      </form.Field>

      <form.Field name="isLimited">
        {(field) => (
          <div className="flex items-center gap-2">
            <input
              id="sake-is-limited"
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              className="size-4 accent-primary"
            />
            <Label htmlFor="sake-is-limited">限定品</Label>
          </div>
        )}
      </form.Field>

      <form.Field name="hasPaidTasting">
        {(field) => (
          <div className="flex items-center gap-2">
            <input
              id="sake-has-paid-tasting"
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              className="size-4 accent-primary"
            />
            <Label htmlFor="sake-has-paid-tasting">有料試飲あり</Label>
          </div>
        )}
      </form.Field>

      <form.Field name="paidTastingPrice">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sake-price">有料試飲の金額（円）</Label>
              <Input
                id="sake-price"
                inputMode="numeric"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                disabled={!form.state.values.hasPaidTasting}
                maxLength={6}
                placeholder="金額が分からないときは空欄"
                aria-invalid={error.length > 0 || undefined}
                className="max-w-64"
              />
              {error.length > 0 && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }}
      </form.Field>

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        「有料試飲あり」にチェックして金額を空にすると、金額未確認として保存します。
        会場で金額が分かったら入力してください（最大 {SAKE_PAID_TASTING_PRICE_MAX} 円）。
      </p>
    </form>
  );
}
