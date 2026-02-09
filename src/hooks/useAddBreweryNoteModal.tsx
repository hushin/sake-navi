import { useState } from 'react';
import { createBreweryNote, type BreweryNote } from '@/lib/api';

type UseAddBreweryNoteModalOptions = {
  breweryId: number;
  onSuccess: (newNote: BreweryNote) => void | Promise<void>;
};

export const useAddBreweryNoteModal = ({
  breweryId,
  onSuccess,
}: UseAddBreweryNoteModalOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setContent('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('ノート内容を入力してください');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const newNote = await createBreweryNote(breweryId, content.trim());
      await onSuccess(newNote);
      close();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ノートの投稿に失敗しました');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const renderModal = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">酒蔵ノートを投稿</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="note-content" className="block text-sm font-medium text-slate-700 mb-2">
                ノート内容
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="例: ブースの雰囲気が良い。スタッフが親切。"
                disabled={isAdding}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
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
                disabled={isAdding}
                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isAdding || !content.trim()}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isAdding ? '投稿中...' : '投稿'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return [renderModal, open] as const;
};
