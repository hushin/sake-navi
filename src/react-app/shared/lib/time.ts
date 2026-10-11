const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// hourCycle を固定しないと、ICU のロケール既定によっては 12 時間表記（午前/午後）になる
const jstDateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * 会場は日本なので、端末のタイムゾーンに依存せず JST で表示する
 * （CI と手元で表示が変わらないようにする意図もある）。
 */
export function formatJstDateTime(value: string | number | Date): string {
  return jstDateTimeFormat.format(new Date(value));
}

/** タイムライン用の相対表記。1 週間より古いものは日時で表示する */
export function formatRelativeTime(value: string | number | Date, now: number): string {
  const diff = now - new Date(value).getTime();

  if (diff < MINUTE_MS) {
    return 'たった今';
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)}分前`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}時間前`;
  }
  if (diff < 7 * DAY_MS) {
    return `${Math.floor(diff / DAY_MS)}日前`;
  }

  return formatJstDateTime(value);
}
