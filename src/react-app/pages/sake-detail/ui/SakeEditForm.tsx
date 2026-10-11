import { useForm } from '@tanstack/react-form';
import { Button, Input, Label } from '@/react-app/shared/ui';
import {
  SAKE_CATEGORIES,
  SAKE_NAME_MAX_LENGTH,
  SAKE_PAID_TASTING_PRICE_MAX,
  SAKE_TYPE_MAX_LENGTH,
  sakeEditSchema,
  type SakeCategory,
  type SakeEditInput,
  type SakeUpdateInput,
  toSakeUpdateInput,
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

/** API の `category` は文字列なので、既知の区分に寄せる */
function toCategory(value: string): SakeCategory {
  return SAKE_CATEGORIES.find((category) => category === value) ?? '清酒';
}

/**
 * 銘柄マスタの編集。身内で使うアプリなので、サインインしていれば誰でも編集できる。
 * 有料試飲の価格は会場で手入力して直す想定なので、空欄（未入力）を許す。
 */
export function SakeEditForm({
  sake,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  sake: SakeForEdit;
  isSubmitting: boolean;
  onSubmit: (input: SakeUpdateInput) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: {
      name: sake.name,
      type: sake.type ?? '',
      category: toCategory(sake.category),
      isLimited: sake.isLimited,
      paidTastingPrice: sake.paidTastingPrice === null ? '' : String(sake.paidTastingPrice),
    } satisfies SakeEditInput,
    validators: {
      onChange: sakeEditSchema,
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

      <form.Field name="paidTastingPrice">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');
          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sake-price">有料試飲の金額（円・未入力でよい）</Label>
              <Input
                id="sake-price"
                inputMode="numeric"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                maxLength={6}
                placeholder="未入力"
                aria-invalid={error.length > 0 || undefined}
                className="max-w-40"
              />
              {error.length > 0 && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }}
      </form.Field>

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : '保存'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        有料試飲の金額は会場で分かったら入力してください（最大 {SAKE_PAID_TASTING_PRICE_MAX} 円）。
      </p>
    </form>
  );
}
