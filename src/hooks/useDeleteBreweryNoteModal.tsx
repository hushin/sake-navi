import { useState } from 'react';
import { deleteBreweryNote, type BreweryNote } from '@/lib/api';

type UseDeleteBreweryNoteModalOptions = {
  breweryId: number;
  onSuccess: (deletedNoteId: number) => void | Promise<void>;
};

export const useDeleteBreweryNoteModal = ({
  breweryId,
  onSuccess,
}: UseDeleteBreweryNoteModalOptions) => {
  const [deletingNote, setDeletingNote] = useState<BreweryNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const open = (note: BreweryNote) => {
    setDeletingNote(note);
  };

  const close = () => {
    setDeletingNote(null);
  };

  const handleDelete = async () => {
    if (!deletingNote) return;

    setIsDeleting(true);
    try {
      await deleteBreweryNote(breweryId, deletingNote.noteId);
      await onSuccess(deletingNote.noteId);
      close();
    } catch (err) {
      console.error('ノート削除エラー:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderModal = () => {
    if (!deletingNote) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">ノートを削除しますか？</h3>
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
