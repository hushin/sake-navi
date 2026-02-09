import { useState } from 'react';
import { updateBreweryNote, type BreweryNote } from '@/lib/api';

type UseEditBreweryNoteModalOptions = {
  breweryId: number;
  onSuccess: (updatedNote: BreweryNote) => void | Promise<void>;
};

export const useEditBreweryNoteModal = ({
  breweryId,
  onSuccess,
}: UseEditBreweryNoteModalOptions) => {
  const [editingNote, setEditingNote] = useState<BreweryNote | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (note: BreweryNote) => {
    setEditingNote(note);
    setContent(note.comment);
    setError(null);
  };

  const close = () => {
    setEditingNote(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    if (!content.trim()) {
      setError('コメントを入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedNote = await updateBreweryNote(breweryId, editingNote.noteId, content.trim());
      await onSuccess(updatedNote);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ノートの編集に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const renderModal = () => {
    if (!editingNote) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">ノートを編集</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 resize-none"
                rows={4}
                maxLength={500}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{content.length} / 500</p>
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
                disabled={isSaving || !content.trim()}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
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
