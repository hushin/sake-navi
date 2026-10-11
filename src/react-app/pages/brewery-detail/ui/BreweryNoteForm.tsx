import { useForm } from '@tanstack/react-form';
import { useId } from 'react';
import { Button, Label, Textarea } from '@/react-app/shared/ui';
import {
  BREWERY_NOTE_MAX_LENGTH,
  breweryNoteInputSchema,
  type BreweryNoteInput,
} from '@/shared/schemas/brewery-note';

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
 * 酒蔵ノートの投稿と編集を兼ねる。`initialComment` に既存のノートを渡すと編集モードになる。
 */
export function BreweryNoteForm({
  initialComment = '',
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialComment?: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (input: BreweryNoteInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const textareaId = useId();
  const form = useForm({
    defaultValues: { comment: initialComment },
    validators: {
      onChange: breweryNoteInputSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ comment: value.comment.trim() });
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="comment">
        {(field) => {
          const error = field.state.meta.errors.map(getErrorMessage).join(', ');

          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor={textareaId}>ノート</Label>
              <Textarea
                id={textareaId}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                maxLength={BREWERY_NOTE_MAX_LENGTH}
                placeholder="列の長さ・売り切れ・混雑など"
                aria-invalid={error.length > 0 || undefined}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {field.state.value.length} / {BREWERY_NOTE_MAX_LENGTH}
                </p>
              </div>
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
    </form>
  );
}
