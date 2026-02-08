'use client';

interface TagSelectorProps {
  /** 選択中のタグ一覧 */
  selectedTags: string[];
  /** タグ選択変更時のコールバック */
  onTagsChange: (tags: string[]) => void;
}

// 排他的に選択するタグのグループ
const EXCLUSIVE_GROUPS: Array<{ label: string; tags: string[] }> = [
  { label: '甘辛', tags: ['甘口', '辛口'] },
  { label: '濃淡', tags: ['濃醇', '淡麗'] },
];

// その他のタグ（複数選択可）
const OTHER_TAGS: string[] = ['にごり', '酸味', '旨味', '熟成', '苦味', '渋味', '発泡'];

// タグごとの色設定（視覚的な区別のため）
const tagColors: Record<string, string> = {
  甘口: 'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200',
  辛口: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  濃醇: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  淡麗: 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200',
  にごり: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  酸味: 'bg-lime-100 text-lime-800 border-lime-300 hover:bg-lime-200',
  旨味: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  熟成: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  苦味: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
  渋味: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  発泡: 'bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200',
};

// 選択時の色設定
const selectedTagColors: Record<string, string> = {
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

/**
 * タグ選択コンポーネント
 * - 甘口/辛口、濃醇/淡麗は排他的に選択
 * - その他のタグは複数選択可能
 * - トグル式の選択UI
 */
export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const toggleTag = (tag: string) => {
    // 排他グループを探す
    const exclusiveGroup = EXCLUSIVE_GROUPS.find((group) => group.tags.includes(tag));

    if (exclusiveGroup) {
      // 排他グループ内のタグの場合
      if (selectedTags.includes(tag)) {
        // 既に選択されている場合は除外
        onTagsChange(selectedTags.filter((t) => t !== tag));
      } else {
        // 選択されていない場合は、同じグループの他のタグを除外して追加
        const otherTagsInGroup = exclusiveGroup.tags.filter((t) => t !== tag);
        const newTags = selectedTags.filter((t) => !otherTagsInGroup.includes(t));
        onTagsChange([...newTags, tag]);
      }
    } else {
      // 通常のタグの場合
      if (selectedTags.includes(tag)) {
        onTagsChange(selectedTags.filter((t) => t !== tag));
      } else {
        onTagsChange([...selectedTags, tag]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 排他的グループ */}
      {EXCLUSIVE_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {group.label}（どちらか一方）
          </div>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => {
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
        </div>
      ))}

      {/* その他のタグ */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          その他の特徴（複数選択可）
        </div>
        <div className="flex flex-wrap gap-2">
          {OTHER_TAGS.map((tag) => {
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
      </div>

      {selectedTags.length > 0 && (
        <div className="text-sm text-gray-600">選択中: {selectedTags.length}個のタグ</div>
      )}
    </div>
  );
}
