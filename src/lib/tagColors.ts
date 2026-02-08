/**
 * タグの色設定を管理する共通定数
 */

// タグごとの色設定（未選択時）
export const TAG_COLORS: Record<string, string> = {
  甘口: 'bg-pink-100 text-pink-800 border-pink-300',
  辛口: 'bg-blue-100 text-blue-800 border-blue-300',
  濃醇: 'bg-amber-100 text-amber-800 border-amber-300',
  淡麗: 'bg-sky-100 text-sky-800 border-sky-300',
  にごり: 'bg-gray-100 text-gray-800 border-gray-300',
  酸味: 'bg-lime-100 text-lime-800 border-lime-300',
  旨味: 'bg-orange-100 text-orange-800 border-orange-300',
  熟成: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  苦味: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  渋味: 'bg-purple-100 text-purple-800 border-purple-300',
  発泡: 'bg-cyan-100 text-cyan-800 border-cyan-300',
};

// タグごとの色設定（選択時 - TagSelector用）
export const SELECTED_TAG_COLORS: Record<string, string> = {
  甘口: 'bg-pink-500 text-white border-pink-600',
  辛口: 'bg-blue-500 text-white border-blue-600',
  濃醇: 'bg-amber-500 text-white border-amber-600',
  淡麗: 'bg-sky-500 text-white border-sky-600',
  にごり: 'bg-gray-500 text-white border-gray-600',
  酸味: 'bg-lime-500 text-white border-lime-600',
  旨味: 'bg-orange-500 text-white border-orange-600',
  熟成: 'bg-yellow-500 text-white border-yellow-600',
  苦味: 'bg-emerald-500 text-white border-emerald-600',
  渋味: 'bg-purple-500 text-white border-purple-600',
  発泡: 'bg-cyan-500 text-white border-cyan-600',
};

// タグごとの色設定（ホバー時 - TagSelector用）
export const TAG_HOVER_COLORS: Record<string, string> = {
  甘口: 'hover:bg-pink-200',
  辛口: 'hover:bg-blue-200',
  濃醇: 'hover:bg-amber-200',
  淡麗: 'hover:bg-sky-200',
  にごり: 'hover:bg-gray-200',
  酸味: 'hover:bg-lime-200',
  旨味: 'hover:bg-orange-200',
  熟成: 'hover:bg-yellow-200',
  苦味: 'hover:bg-emerald-200',
  渋味: 'hover:bg-purple-200',
  発泡: 'hover:bg-cyan-200',
};

/**
 * タグの色クラスを取得（表示用）
 */
export function getTagColorClass(tag: string): string {
  return TAG_COLORS[tag] || 'bg-slate-100 text-slate-800 border-slate-300';
}

/**
 * タグの色クラスを取得（選択時 - TagSelector用）
 */
export function getSelectedTagColorClass(tag: string): string {
  return SELECTED_TAG_COLORS[tag] || 'bg-slate-500 text-white border-slate-600';
}

/**
 * タグの色クラスを取得（ホバー時 - TagSelector用）
 */
export function getTagHoverColorClass(tag: string): string {
  return TAG_HOVER_COLORS[tag] || 'hover:bg-slate-200';
}
