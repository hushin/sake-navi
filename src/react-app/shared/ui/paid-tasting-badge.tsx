import { parsePaidTasting } from '@/shared/schemas/sake';
import { Badge } from './badge';

/**
 * 有料試飲の表示。出典 PDF の名残で `7` は「有料試飲あり・金額は未確認」を表すので、
 * そのまま金額として出すと `¥7` になってしまう。解釈はここに集約する。
 */
export function PaidTastingBadge({
  price,
  className,
}: {
  /** `sakes.paid_tasting_price` の生の値 */
  price: number | null;
  className?: string;
}) {
  const paidTasting = parsePaidTasting(price);

  if (!paidTasting.hasPaidTasting) {
    return null;
  }

  return (
    <Badge variant="outline" className={className}>
      {paidTasting.price === null ? '有料試飲（金額未確認）' : `有料試飲 ¥${paidTasting.price}`}
    </Badge>
  );
}
