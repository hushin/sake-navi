import { REVIEW_TAGS, type ReviewTag } from '@/shared/schemas/sake';
import { Button } from '@/react-app/shared/ui';

/**
 * 甘辛・濃淡は同時に選べない（両方選ぶと意味が反転してしまうため）。
 * それ以外のタグは複数選択できる。
 */
const EXCLUSIVE_GROUPS: ReadonlyArray<readonly ReviewTag[]> = [
  ['甘口', '辛口'],
  ['濃醇', '淡麗'],
];

export function TagSelector({
  value,
  onChange,
}: {
  value: ReviewTag[];
  onChange: (tags: ReviewTag[]) => void;
}) {
  const toggle = (tag: ReviewTag) => {
    const group = EXCLUSIVE_GROUPS.find((candidates) => candidates.includes(tag));

    if (!group) {
      onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
      return;
    }

    const withoutGroup = value.filter((item) => !group.includes(item));
    onChange(value.includes(tag) ? withoutGroup : [...withoutGroup, tag]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {REVIEW_TAGS.map((tag) => {
        const isSelected = value.includes(tag);
        return (
          <Button
            key={tag}
            type="button"
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            aria-pressed={isSelected}
            onClick={() => toggle(tag)}
          >
            {tag}
          </Button>
        );
      })}
    </div>
  );
}
