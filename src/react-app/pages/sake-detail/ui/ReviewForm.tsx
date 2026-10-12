import { revalidateLogic, useForm } from '@tanstack/react-form';
import type { ReviewTag } from '@/shared/schemas/sake';
import { REVIEW_COMMENT_MAX_LENGTH, reviewFormSchema } from '@/shared/schemas/sake';
import { Button, Label, Textarea } from '@/react-app/shared/ui';
import { RatingInput } from './RatingInput';
import { TagSelector } from './TagSelector';

export type ReviewFormValues = {
  /** 0 は未入力。スライダーを動かすと 0.25 刻みの値が入る */
  rating: number;
  tags: ReviewTag[];
  /** 未入力は undefined（zod スキーマの input 型に合わせる） */
  comment?: string;
  notifyDiscord: boolean;
};

function getErrorMessage(error: unknown): string {
  if (error != null && typeof error === 'object' && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '';
}

/**
 * レビューの投稿と編集を兼ねる。`initialValues` に自分のレビューを渡すと編集モードになる。
 */
export function ReviewForm({
  initialValues,
  isSubmitting,
  isDeleting,
  submitLabel,
  showNotifyDiscord,
  onSubmit,
  onDelete,
}: {
  initialValues: ReviewFormValues;
  isSubmitting: boolean;
  isDeleting?: boolean;
  submitLabel: string;
  /** 新規投稿のときだけ Discord 通知のチェックを出す（編集では通知しない） */
  showNotifyDiscord?: boolean;
  onSubmit: (values: ReviewFormValues) => Promise<void>;
  onDelete?: () => void;
}) {
  const form = useForm({
    defaultValues: initialValues,
    // 送信するまでは検証しない。タグや通知のチェックを押しただけで「評価を選んでください」が
    // 出てしまうのを防ぐ（送信に失敗したあとは、直したそばから検証する）。
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: reviewFormSchema,
    },
    onSubmit: async ({ value }) => {
      const comment = (value.comment ?? '').trim();
      await onSubmit({
        rating: value.rating,
        tags: value.tags,
        comment,
        notifyDiscord: value.notifyDiscord,
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="rating">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');

          return (
            <div className="flex flex-col gap-2">
              <RatingInput
                value={field.state.value}
                onChange={(rating) => field.handleChange(rating)}
              />
              {error.length > 0 && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="tags">
        {(field) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">タグ（任意）</span>
            <TagSelector value={field.state.value} onChange={(tags) => field.handleChange(tags)} />
          </div>
        )}
      </form.Field>

      <form.Field name="comment">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="review-comment">コメント（任意）</Label>
              <Textarea
                id="review-comment"
                value={field.state.value ?? ''}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                rows={4}
                maxLength={REVIEW_COMMENT_MAX_LENGTH}
                placeholder="飲んだ感想を残す"
                aria-invalid={error.length > 0 || undefined}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {field.state.value?.length ?? 0} / {REVIEW_COMMENT_MAX_LENGTH}
                </p>
              </div>
            </div>
          );
        }}
      </form.Field>

      {showNotifyDiscord && (
        <form.Field name="notifyDiscord">
          {(field) => (
            <div className="flex items-center gap-2">
              <input
                id="review-notify-discord"
                type="checkbox"
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
                className="size-4 accent-primary"
              />
              <Label htmlFor="review-notify-discord">Discord に通知する</Label>
            </div>
          )}
        </form.Field>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : submitLabel}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? '削除中…' : 'レビューを削除'}
          </Button>
        )}
      </div>
    </form>
  );
}
