'use client';

import { TAG_COLORS, SELECTED_TAG_COLORS, TAG_HOVER_COLORS } from '@/lib/tagColors';

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
const OTHER_TAGS: string[] = ['酸味', '旨味', '熟成', '苦味', '渋味', 'にごり', '発泡'];

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
              const baseColor = TAG_COLORS[tag] || 'bg-slate-100 text-slate-800 border-slate-300';
              const selectedColor =
                SELECTED_TAG_COLORS[tag] || 'bg-slate-500 text-white border-slate-600';
              const hoverColor = TAG_HOVER_COLORS[tag] || 'hover:bg-slate-200';

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`
                    px-4 py-2 rounded-full border-2 font-medium text-sm
                    transition-all duration-150 ease-in-out
                    hover:scale-105 active:scale-95
                    cursor-pointer
                    ${isSelected ? selectedColor : `${baseColor} ${hoverColor}`}
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
            const baseColor = TAG_COLORS[tag] || 'bg-slate-100 text-slate-800 border-slate-300';
            const selectedColor =
              SELECTED_TAG_COLORS[tag] || 'bg-slate-500 text-white border-slate-600';
            const hoverColor = TAG_HOVER_COLORS[tag] || 'hover:bg-slate-200';

            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`
                  px-4 py-2 rounded-full border-2 font-medium text-sm
                  transition-all duration-150 ease-in-out
                  hover:scale-105 active:scale-95
                    cursor-pointer
                  ${isSelected ? selectedColor : `${baseColor} ${hoverColor}`}
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
