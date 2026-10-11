const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * 会場は日本なので、端末のタイムゾーンに依存せず JST で表示する
 * （CI と手元で表示が変わらないようにする意図もある）。
 */
export function formatJstDateTime(value: string | number | Date): string {
  const date = new Date(new Date(value).getTime() + JST_OFFSET_MS);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${month}/${day} ${hours}:${minutes}`;
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
