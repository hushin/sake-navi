import { formatJstDateTime, formatRelativeTime } from './time';

describe('formatJstDateTime', () => {
  it('UTC の時刻を JST（+9 時間）で表示する', () => {
    // 2026-10-11T06:30:00Z は JST で 10月11日 15:30
    expect(formatJstDateTime('2026-10-11T06:30:00.000Z')).toBe('10月11日 15:30');
  });

  it('日付をまたぐ場合も JST で繰り上がる', () => {
    expect(formatJstDateTime('2026-10-11T15:00:00.000Z')).toBe('10月12日 00:00');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-11T06:30:00.000Z').getTime();

  it.each([
    ['2026-10-11T06:30:00.000Z', 'たった今'],
    ['2026-10-11T06:29:00.000Z', '1分前'],
    ['2026-10-11T05:30:00.000Z', '1時間前'],
    ['2026-10-09T06:30:00.000Z', '2日前'],
  ])('%s は %s', (value, expected) => {
    expect(formatRelativeTime(value, now)).toBe(expected);
  });

  it('1 週間より古いものは日時で表示する', () => {
    expect(formatRelativeTime('2026-10-01T06:30:00.000Z', now)).toBe('10月1日 15:30');
  });
});
