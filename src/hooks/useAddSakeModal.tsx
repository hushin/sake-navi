import { useState } from 'react';
import { addCustomSake, type SakeCategory } from '@/lib/api';

type UseAddSakeModalOptions = {
  breweryId: number;
  onSuccess: () => void | Promise<void>;
};

export const useAddSakeModal = ({ breweryId, onSuccess }: UseAddSakeModalOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [isLimited, setIsLimited] = useState(false);
  const [paidTastingPrice, setPaidTastingPrice] = useState('');
  const [category, setCategory] = useState<SakeCategory>('清酒');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setName('');
    setType('');
    setIsLimited(false);
    setPaidTastingPrice('');
    setCategory('清酒');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('お酒の名前を入力してください');
      return;
    }

    // 有料試飲価格のバリデーション
    const paidTastingPriceValue = paidTastingPrice.trim()
      ? parseInt(paidTastingPrice.trim(), 10)
      : undefined;

    if (paidTastingPrice.trim() && (isNaN(paidTastingPriceValue!) || paidTastingPriceValue! <= 0)) {
      setError('有料試飲価格は正の整数で入力してください');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await addCustomSake(breweryId, {
        name: name.trim(),
        type: type.trim() || undefined,
        isLimited,
        paidTastingPrice: paidTastingPriceValue,
        category,
      });

      await onSuccess();
      close();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('お酒の追加に失敗しました');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const renderModal = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-4">お酒を追加</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sake-name" className="block text-sm font-medium text-slate-700 mb-2">
                お酒の名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="sake-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 特別純米 しぼりたて"
                disabled={isAdding}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                maxLength={100}
                autoFocus
                data-1p-ignore
              />
            </div>

            <div>
              <label htmlFor="sake-type" className="block text-sm font-medium text-slate-700 mb-2">
                種類
              </label>
              <input
                id="sake-type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="例: 純米大吟醸"
                disabled={isAdding}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                maxLength={50}
                data-1p-ignore
              />
            </div>

            <div>
              <label
                htmlFor="sake-category"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                区分
              </label>
              <select
                id="sake-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SakeCategory)}
                disabled={isAdding}
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
                id="sake-is-limited"
                type="checkbox"
                checked={isLimited}
                onChange={(e) => setIsLimited(e.target.checked)}
                disabled={isAdding}
                className="w-5 h-5 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-blue-600 disabled:cursor-not-allowed"
              />
              <label
                htmlFor="sake-is-limited"
                className="text-sm font-medium text-slate-700 cursor-pointer select-none"
              >
                限定酒
              </label>
            </div>

            <div>
              <label
                htmlFor="sake-paid-tasting-price"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                有料試飲価格（円）
              </label>
              <input
                id="sake-paid-tasting-price"
                type="number"
                value={paidTastingPrice}
                onChange={(e) => setPaidTastingPrice(e.target.value)}
                placeholder="例: 500"
                disabled={isAdding}
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
                disabled={isAdding}
                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isAdding || !name.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isAdding ? '追加中...' : '追加'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return [renderModal, open] as const;
};
