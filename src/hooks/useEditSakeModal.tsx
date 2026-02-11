import { useState } from 'react';
import { updateSake, type Sake } from '@/lib/api';

type UseEditSakeModalOptions = {
  onSuccess: () => void | Promise<void>;
};

export const useEditSakeModal = ({ onSuccess }: UseEditSakeModalOptions) => {
  const [editingSake, setEditingSake] = useState<Sake | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [isLimited, setIsLimited] = useState(false);
  const [paidTastingPrice, setPaidTastingPrice] = useState('');
  const [category, setCategory] = useState('清酒');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (sake: Sake) => {
    setEditingSake(sake);
    setName(sake.name);
    setType(sake.type || '');
    setIsLimited(sake.isLimited);
    setPaidTastingPrice(sake.paidTastingPrice != null ? String(sake.paidTastingPrice) : '');
    setCategory(sake.category || '清酒');
    setError(null);
  };

  const close = () => {
    setEditingSake(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSake) return;

    if (!name.trim()) {
      setError('お酒の名前を入力してください');
      return;
    }

    const paidTastingPriceValue = paidTastingPrice.trim()
      ? parseInt(paidTastingPrice.trim(), 10)
      : undefined;

    if (paidTastingPrice.trim() && (isNaN(paidTastingPriceValue!) || paidTastingPriceValue! <= 0)) {
      setError('有料試飲価格は正の整数で入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateSake(editingSake.sakeId, {
        name: name.trim(),
        type: type.trim() || undefined,
        isLimited,
        paidTastingPrice: paidTastingPriceValue,
        category,
      });

      await onSuccess();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お酒の編集に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const renderModal = () => {
    if (!editingSake) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-4">お酒を編集</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-sake-name"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                お酒の名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-sake-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 特別純米 しぼりたて"
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                maxLength={100}
                autoFocus
                data-1p-ignore
              />
            </div>

            <div>
              <label
                htmlFor="edit-sake-type"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                種類
              </label>
              <input
                id="edit-sake-type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="例: 純米大吟醸"
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                maxLength={50}
                data-1p-ignore
              />
            </div>

            <div>
              <label
                htmlFor="edit-sake-category"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                区分
              </label>
              <select
                id="edit-sake-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="清酒">清酒</option>
                <option value="リキュール">リキュール</option>
                <option value="みりん">みりん</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-sake-is-limited"
                type="checkbox"
                checked={isLimited}
                onChange={(e) => setIsLimited(e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-blue-600 disabled:cursor-not-allowed"
              />
              <label
                htmlFor="edit-sake-is-limited"
                className="text-sm font-medium text-slate-700 cursor-pointer select-none"
              >
                限定酒
              </label>
            </div>

            <div>
              <label
                htmlFor="edit-sake-paid-tasting-price"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                有料試飲価格（円）
              </label>
              <input
                id="edit-sake-paid-tasting-price"
                type="number"
                value={paidTastingPrice}
                onChange={(e) => setPaidTastingPrice(e.target.value)}
                placeholder="例: 500"
                disabled={isSaving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                min="1"
                step="1"
                data-1p-ignore
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
                disabled={isSaving || !name.trim()}
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
