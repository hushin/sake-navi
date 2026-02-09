import { useState } from 'react';
import { deleteReview } from '@/lib/api';

type UseDeleteReviewModalOptions = {
  onSuccess: () => void | Promise<void>;
};

export const useDeleteReviewModal = ({ onSuccess }: UseDeleteReviewModalOptions) => {
  const [deletingReview, setDeletingReview] = useState<{
    sakeId: number;
    reviewId: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const open = (sakeId: number, reviewId: number) => {
    setDeletingReview({ sakeId, reviewId });
  };

  const close = () => {
    setDeletingReview(null);
  };

  const handleDelete = async () => {
    if (!deletingReview) return;

    setIsDeleting(true);
    try {
      await deleteReview(deletingReview.sakeId, deletingReview.reviewId);
      await onSuccess();
      close();
    } catch (err) {
      console.error('レビュー削除エラー:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderModal = () => {
    if (!deletingReview) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">レビューを削除しますか？</h3>
          <p className="text-sm text-slate-600 mb-6">この操作は元に戻せません。</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
            >
              {isDeleting ? '削除中...' : '削除'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return [renderModal, open] as const;
};
