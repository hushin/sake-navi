import { REVIEW_TAGS, type ReviewTag } from '@/shared/schemas/sake';
import { TagToggle } from '@/react-app/shared/ui';

/**
 * 甘辛・濃淡は同時に選べない（両方選ぶと意味が反転してしまうため）。
 * それ以外のタグは複数選択できる。
 */
const EXCLUSIVE_GROUPS: ReadonlyArray<{ label: string; tags: readonly ReviewTag[] }> = [
  { label: '甘辛', tags: ['甘口', '辛口'] },
  { label: '濃淡', tags: ['濃醇', '淡麗'] },
];

/** 排他のグループに入らないタグ。`REVIEW_TAGS` に足せば自動でここに出る */
const OTHER_TAGS = REVIEW_TAGS.filter(
  (tag) => !EXCLUSIVE_GROUPS.some((group) => group.tags.includes(tag)),
);

/**
 * タグの選択。仲間（甘辛 / 濃淡 / その他の特徴）ごとに並べて、
 * どれが排他でどれが複数選べるのかをひと目で分かるようにする。
 */
export function TagSelector({
  value,
  onChange,
}: {
  value: ReviewTag[];
  onChange: (tags: ReviewTag[]) => void;
}) {
  const toggle = (tag: ReviewTag) => {
    const group = EXCLUSIVE_GROUPS.find((candidates) => candidates.tags.includes(tag));

    if (!group) {
      onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
      return;
    }

    const withoutGroup = value.filter((item) => !group.tags.includes(item));
    onChange(value.includes(tag) ? withoutGroup : [...withoutGroup, tag]);
  };

  const renderGroup = (tags: readonly ReviewTag[]) => (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagToggle
          key={tag}
          tag={tag}
          size="lg"
          isSelected={value.includes(tag)}
          onClick={() => toggle(tag)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {EXCLUSIVE_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{group.label}（どちらか一方）</p>
          {renderGroup(group.tags)}
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">その他の特徴（複数選択可）</p>
        {renderGroup(OTHER_TAGS)}
      </div>
    </div>
  );
}
