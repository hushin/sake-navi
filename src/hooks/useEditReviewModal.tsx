import { useState } from 'react';
import { updateReview, type Review } from '@/lib/api';
import { StarRating } from '@/components/StarRating';
import { TagSelector } from '@/components/TagSelector';

type UseEditReviewModalOptions = {
  onSuccess: () => void | Promise<void>;
};

export const useEditReviewModal = ({ onSuccess }: UseEditReviewModalOptions) => {
  const [editingReview, setEditingReview] = useState<{
    sakeId: number;
    review: Review;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (sakeId: number, review: Review) => {
    setEditingReview({ sakeId, review });
    setRating(review.rating);
    setTags(review.tags);
    setComment(review.comment || '');
    setError(null);
  };

  const close = () => {
    setEditingReview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateReview(editingReview.sakeId, editingReview.review.id, {
        rating,
        tags,
        comment: comment || undefined,
      });

      await onSuccess();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの編集に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const renderModal = () => {
    if (!editingReview) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-4">レビューを編集</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">評価</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">タグ</label>
              <TagSelector selectedTags={tags} onTagsChange={setTags} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">コメント</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSaving || rating === 0}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return [renderModal, open] as const;
};
