'use client';

interface TagSelectorProps {
  /** 選択中のタグ一覧 */
  selectedTags: string[];
  /** タグ選択変更時のコールバック */
  onTagsChange: (tags: string[]) => void;
}

// CLAUDE.mdに記載のタグ一覧
const AVAILABLE_TAGS = [
  '甘口',
  '辛口',
  '濃醇',
  '淡麗',
  'にごり',
  '酸',
  '旨味',
  '熟成',
  '苦味',
  '発泡',
] as const;

// タグごとの色設定（視覚的な区別のため）
const tagColors: Record<string, string> = {
  甘口: 'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200',
  辛口: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  濃醇: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  淡麗: 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200',
  にごり: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  酸: 'bg-lime-100 text-lime-800 border-lime-300 hover:bg-lime-200',
  旨味: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  熟成: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  苦味: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
  発泡: 'bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200',
};

// 選択時の色設定
const selectedTagColors: Record<string, string> = {
  甘口: 'bg-pink-500 text-white border-pink-600',
  辛口: 'bg-blue-500 text-white border-blue-600',
  濃醇: 'bg-amber-500 text-white border-amber-600',
  淡麗: 'bg-sky-500 text-white border-sky-600',
  にごり: 'bg-gray-500 text-white border-gray-600',
  酸: 'bg-lime-500 text-white border-lime-600',
  旨味: 'bg-orange-500 text-white border-orange-600',
  熟成: 'bg-yellow-500 text-white border-yellow-600',
  苦味: 'bg-emerald-500 text-white border-emerald-600',
  発泡: 'bg-cyan-500 text-white border-cyan-600',
};

/**
 * タグ選択コンポーネント
 * - CLAUDE.mdに記載のタグ一覧から複数選択可能
 * - トグル式の選択UI
 */
export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // 既に選択されている場合は除外
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      // 選択されていない場合は追加
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          const colorClass = isSelected ? selectedTagColors[tag] : tagColors[tag];

          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`
                px-4 py-2 rounded-full border-2 font-medium text-sm
                transition-all duration-150 ease-in-out
                hover:scale-105 active:scale-95
                ${colorClass}
                ${isSelected ? 'shadow-md' : 'shadow-sm'}
              `}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className="mr-1" aria-hidden="true">
                  ✓
                </span>
              )}
              {tag}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <div className="text-sm text-gray-600">選択中: {selectedTags.length}個のタグ</div>
      )}
    </div>
  );
}
