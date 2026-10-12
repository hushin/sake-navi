/**
 * ダンプした JSON から、イベント後に配る共有用の静的 HTML を 1 枚生成する。
 *
 * Usage: node --experimental-strip-types scripts/archive-generate.ts
 *
 * - 入力は `pnpm archive:dump` が作る dist/archive/*.json
 * - 出力は dist/archive/<実行年>.html（`dist` は gitignore 済み）
 * - マップの配置計算は src/react-app/shared/lib/map-layout.ts を共用する
 *   （旧実装は画面とアーカイブに同じ計算をコピーしていて二重管理になっていた）
 *
 * 生成物はサーバを立てずにブラウザで開ける 1 ファイル完結の HTML（CSS / JS を埋め込む）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  mapPointFor,
  mapSize,
} from '../src/react-app/shared/lib/map-layout.ts';
import { formatJstDateTime } from '../src/react-app/shared/lib/time.ts';
import {
  formatRating,
  parsePaidTasting,
  RATING_MAX,
  toRatingStep,
} from '../src/shared/schemas/sake.ts';
import { z } from 'zod';

const DATA_DIR = join(process.cwd(), 'dist', 'archive');

// --- D1 の行（archive-dump.ts がそのまま出した形。列名は schema のまま） ---

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().nullable(),
  created_at: z.number(),
});

const brewerySchema = z.object({
  id: z.number(),
  name: z.string(),
  map_column: z.number(),
  map_row: z.number(),
});

const sakeSchema = z.object({
  id: z.number(),
  brewery_id: z.number(),
  name: z.string(),
  type: z.string().nullable(),
  category: z.string(),
  is_limited: z.number(),
  paid_tasting_price: z.number().nullable(),
  is_custom: z.number(),
});

const reviewSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  sake_id: z.number(),
  rating: z.number(),
  /** JSON 文字列（Drizzle の `mode: 'json'`） */
  tags: z.string(),
  comment: z.string().nullable(),
  created_at: z.number(),
});

const breweryNoteSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  brewery_id: z.number(),
  comment: z.string(),
  created_at: z.number(),
});

type BreweryRow = z.infer<typeof brewerySchema>;

/**
 * ダンプを読む。形が違えばここで落とすので、DB のスキーマを変えたのに dump が
 * 古いまま、という事故に気づける。
 */
function loadJson<T>(name: string, schema: z.ZodType<T>): T {
  const path = join(DATA_DIR, `${name}.json`);

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    throw new Error(`${path} を読めませんでした。先に \`pnpm archive:dump\` を実行してください`);
  }

  const result = schema.safeParse(JSON.parse(raw));
  if (!result.success) {
    throw new Error(
      `${path} の形が想定と違います。\`pnpm archive:dump\` をやり直してください\n${result.error.message}`,
    );
  }
  return result.data;
}

const users = loadJson('users', z.array(userSchema));
const breweries = loadJson('breweries', z.array(brewerySchema));
const sakes = loadJson('sakes', z.array(sakeSchema));
const reviews = loadJson('reviews', z.array(reviewSchema));
const breweryNotes = loadJson('brewery_notes', z.array(breweryNoteSchema));

// --- ルックアップ ---

const userMap = new Map(users.map((user) => [user.id, user]));
const breweryMap = new Map(breweries.map((brewery) => [brewery.id, brewery]));
const sakeMap = new Map(sakes.map((sake) => [sake.id, sake]));

/** 表示名はアプリと同じく `nickname ?? name` */
function displayName(userId: string): string {
  const user = userMap.get(userId);
  return user?.nickname ?? user?.name ?? '不明';
}

function groupBy<T>(items: T[], key: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = map.get(k);
    if (group) {
      group.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}

function groupByUser<T extends { user_id: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = map.get(item.user_id);
    if (group) {
      group.push(item);
    } else {
      map.set(item.user_id, [item]);
    }
  }
  return map;
}

const sakesByBrewery = groupBy(sakes, (sake) => sake.brewery_id);
const reviewsBySake = groupBy(reviews, (review) => review.sake_id);
const notesByBrewery = groupBy(breweryNotes, (note) => note.brewery_id);
const reviewsByUser = groupByUser(reviews);

// --- ユーティリティ ---

function esc(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseTags(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const tags = JSON.parse(raw) as unknown;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

/** 端数の星は文字では出せないので、整数の星に数値を併記する（4.25 → 「★★★★☆ 4.25」） */
function stars(rating: number): string {
  const full = Math.floor(toRatingStep(rating));
  return `${'★'.repeat(full)}${'☆'.repeat(RATING_MAX - full)} ${formatRating(rating)}`;
}

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  甘口: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  辛口: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  濃醇: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  淡麗: { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
  にごり: { bg: '#f3f4f6', text: '#1f2937', border: '#d1d5db' },
  酸味: { bg: '#ecfccb', text: '#3f6212', border: '#bef264' },
  旨味: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  熟成: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  苦味: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  渋味: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  発泡: { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
  フルーティ: { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af' },
};

function tagBadge(tag: string): string {
  const color = TAG_COLORS[tag] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  return `<span class="tag" style="background:${color.bg};color:${color.text};border-color:${color.border}">${esc(tag)}</span>`;
}

// --- マップ ---

function generateMap(): string {
  // 酒蔵ごとの平均評価（マップのバッジに出す）
  const averageByBrewery = new Map<number, number>();
  for (const brewery of breweries) {
    const ratings = (sakesByBrewery.get(brewery.id) ?? []).flatMap((sake) =>
      (reviewsBySake.get(sake.id) ?? []).map((review) => review.rating),
    );
    if (ratings.length > 0) {
      averageByBrewery.set(
        brewery.id,
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      );
    }
  }

  const badges = breweries
    .map((brewery) => {
      const point = mapPointFor(brewery.map_column, brewery.map_row);
      const average = averageByBrewery.get(brewery.id);
      // ブース番号はバッジの外側（奇数なら左、偶数なら右）に出す
      const idPosition =
        brewery.map_column % 2 === 1 ? 'right:100%;margin-right:4px' : 'left:100%;margin-left:4px';

      return `<a href="#brewery-${brewery.id}" class="map-badge${average === undefined ? '' : ' map-badge-reviewed'}" style="left:${point.x}px;top:${point.y}px;width:${CELL_WIDTH}px;height:${CELL_HEIGHT}px" data-brewery-id="${brewery.id}">
        <div class="map-badge-id" style="${idPosition}">No.${brewery.id}</div>
        <div class="map-badge-name">${esc(brewery.name)}</div>
        ${average === undefined ? '<div class="map-badge-norating">未評価</div>' : `<div class="map-badge-rating">★ ${average.toFixed(1)}</div>`}
      </a>`;
    })
    .join('');

  const size = mapSize(
    breweries.map((brewery) => ({ mapColumn: brewery.map_column, mapRow: brewery.map_row })),
  );
  return `<div class="map-container"><div class="map-inner" style="width:${size.width}px;height:${size.height}px">${badges}</div></div>`;
}

// --- 統計 ---

function computeStats() {
  const sakeRanking: {
    sakeId: number;
    sakeName: string;
    breweryName: string;
    average: number;
    count: number;
  }[] = [];
  for (const [sakeId, sakeReviews] of reviewsBySake) {
    if (sakeReviews.length === 0) {
      continue;
    }
    const sake = sakeMap.get(sakeId);
    if (!sake) {
      continue;
    }
    sakeRanking.push({
      sakeId,
      sakeName: sake.name,
      breweryName: breweryMap.get(sake.brewery_id)?.name ?? '不明',
      average: sakeReviews.reduce((sum, review) => sum + review.rating, 0) / sakeReviews.length,
      count: sakeReviews.length,
    });
  }
  sakeRanking.sort((a, b) => b.average - a.average || b.count - a.count);

  const reviewCountByUser = new Map<string, number>();
  for (const review of reviews) {
    reviewCountByUser.set(review.user_id, (reviewCountByUser.get(review.user_id) ?? 0) + 1);
  }
  const userRanking = [...reviewCountByUser.entries()]
    .map(([userId, count]) => ({ name: displayName(userId), count }))
    .toSorted((a, b) => b.count - a.count);

  const tagCount = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of parseTags(review.tags)) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const tagRanking = [...tagCount.entries()].toSorted((a, b) => b[1] - a[1]);

  return { sakeRanking, userRanking, tagRanking };
}

// --- HTML ---

function generateBrewerySection(brewery: BreweryRow): string {
  const brewerySakes = sakesByBrewery.get(brewery.id) ?? [];
  const breweryNotesForThis = notesByBrewery.get(brewery.id) ?? [];

  const sakesHtml = brewerySakes
    .map((sake) => {
      const sakeReviews = reviewsBySake.get(sake.id) ?? [];
      const average =
        sakeReviews.length > 0
          ? (
              sakeReviews.reduce((sum, review) => sum + review.rating, 0) / sakeReviews.length
            ).toFixed(1)
          : null;

      const badges: string[] = [];
      if (sake.is_limited) {
        badges.push('<span class="badge badge-limited">限定</span>');
      }
      if (sake.category && sake.category !== '清酒') {
        badges.push(`<span class="badge badge-category">${esc(sake.category)}</span>`);
      }
      // 7 は「有料試飲あり・金額は未確認」の印なので、金額として出さない
      const paidTasting = parsePaidTasting(sake.paid_tasting_price);
      if (paidTasting.hasPaidTasting) {
        badges.push(
          `<span class="badge badge-paid">${paidTasting.price === null ? '有料試飲（金額未確認）' : `有料試飲 ¥${paidTasting.price}`}</span>`,
        );
      }
      if (sake.is_custom) {
        badges.push('<span class="badge badge-custom">ユーザー追加</span>');
      }

      const reviewsHtml =
        sakeReviews.length > 0
          ? `<div class="reviews-list">${sakeReviews
              .map(
                (review) => `
            <div class="review">
              <div class="review-header">
                <a href="#" class="review-user user-link" data-user-id="${esc(review.user_id)}">${esc(displayName(review.user_id))}</a>
                <span class="review-rating">${stars(review.rating)}</span>
                <span class="review-date">${formatJstDateTime(review.created_at)}</span>
              </div>
              ${parseTags(review.tags).length > 0 ? `<div class="review-tags">${parseTags(review.tags).map(tagBadge).join('')}</div>` : ''}
              ${review.comment ? `<div class="review-comment">${esc(review.comment)}</div>` : ''}
            </div>`,
              )
              .join('')}
          </div>`
          : '<div class="no-reviews">レビューなし</div>';

      return `
      <div class="sake-card">
        <div class="sake-header">
          <span class="sake-name">${esc(sake.name)}</span>
          ${sake.type ? `<span class="sake-type">${esc(sake.type)}</span>` : ''}
          ${badges.join('')}
          ${average ? `<span class="sake-avg">★ ${average}</span>` : ''}
        </div>
        ${reviewsHtml}
      </div>`;
    })
    .join('');

  const notesHtml =
    breweryNotesForThis.length > 0
      ? `<div class="notes-section">
      <div class="notes-heading">酒蔵ノート (${breweryNotesForThis.length}件)</div>
      <div class="notes-list">${breweryNotesForThis
        .map(
          (note) => `
        <div class="note">
          <span class="note-user">${esc(displayName(note.user_id))}</span>
          <span class="note-date">${formatJstDateTime(note.created_at)}</span>
          <div class="note-comment">${esc(note.comment)}</div>
        </div>`,
        )
        .join('')}
      </div>
    </div>`
      : '';

  return `
  <div class="brewery-section" id="brewery-${brewery.id}" data-name="${esc(brewery.name)}">
    <h3 class="brewery-title">
      <span class="brewery-no">No.${brewery.id}</span>
      ${esc(brewery.name)}
    </h3>
    ${sakesHtml}
    ${notesHtml}
  </div>`;
}

function generateTimeline(): string {
  const items: { time: number; html: string }[] = [];

  for (const review of reviews) {
    const sake = sakeMap.get(review.sake_id);
    const brewery = sake ? breweryMap.get(sake.brewery_id) : null;
    items.push({
      time: review.created_at,
      html: `
      <div class="timeline-item timeline-review">
        <div class="timeline-header">
          <a href="#" class="timeline-user user-link" data-user-id="${esc(review.user_id)}">${esc(displayName(review.user_id))}</a>
          <span class="timeline-action">がレビュー</span>
          <span class="timeline-date">${formatJstDateTime(review.created_at)}</span>
        </div>
        <div class="timeline-target">
          <a href="#brewery-${sake?.brewery_id ?? 0}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a> / ${esc(sake?.name ?? '不明')}
        </div>
        <div class="timeline-rating">${stars(review.rating)}</div>
        ${parseTags(review.tags).length > 0 ? `<div class="timeline-tags">${parseTags(review.tags).map(tagBadge).join('')}</div>` : ''}
        ${review.comment ? `<div class="timeline-comment">${esc(review.comment)}</div>` : ''}
      </div>`,
    });
  }

  for (const note of breweryNotes) {
    const brewery = breweryMap.get(note.brewery_id);
    items.push({
      time: note.created_at,
      html: `
      <div class="timeline-item timeline-note">
        <div class="timeline-header">
          <a href="#" class="timeline-user user-link" data-user-id="${esc(note.user_id)}">${esc(displayName(note.user_id))}</a>
          <span class="timeline-action">がノート投稿</span>
          <span class="timeline-date">${formatJstDateTime(note.created_at)}</span>
        </div>
        <div class="timeline-target">
          <a href="#brewery-${note.brewery_id}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a>
        </div>
        <div class="timeline-comment">${esc(note.comment)}</div>
      </div>`,
    });
  }

  items.sort((a, b) => b.time - a.time);
  return items.map((item) => item.html).join('');
}

function generateUserReviews(): string {
  const userOptions = users
    .map(
      (user) =>
        `<option value="${esc(user.id)}">${esc(displayName(user.id))} (${reviewsByUser.get(user.id)?.length ?? 0}件)</option>`,
    )
    .join('');

  // 各ユーザーのレビューをプリレンダリングしておき、select で表示を切り替える
  const userSections = users
    .map((user) => {
      const userReviews = [...(reviewsByUser.get(user.id) ?? [])].toSorted(
        (a, b) => b.created_at - a.created_at,
      );

      const body =
        userReviews.length > 0
          ? userReviews
              .map((review) => {
                const sake = sakeMap.get(review.sake_id);
                const brewery = sake ? breweryMap.get(sake.brewery_id) : null;
                return `
          <div class="timeline-item timeline-review">
            <div class="timeline-header">
              <span class="timeline-date">${formatJstDateTime(review.created_at)}</span>
            </div>
            <div class="timeline-target">
              <a href="#brewery-${sake?.brewery_id ?? 0}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a> / ${esc(sake?.name ?? '不明')}
            </div>
            <div class="timeline-rating">${stars(review.rating)}</div>
            ${parseTags(review.tags).length > 0 ? `<div class="timeline-tags">${parseTags(review.tags).map(tagBadge).join('')}</div>` : ''}
            ${review.comment ? `<div class="timeline-comment">${esc(review.comment)}</div>` : ''}
          </div>`;
              })
              .join('')
          : '<div class="no-reviews">レビューなし</div>';

      return `<div class="user-reviews-section" data-user-id="${esc(user.id)}" style="display:none">${body}</div>`;
    })
    .join('');

  return `
    <div class="user-select-wrapper">
      <select id="user-select" class="user-select">
        <option value="">ユーザーを選択...</option>
        ${userOptions}
      </select>
    </div>
    ${userSections}`;
}

function generateRanking(): string {
  const { sakeRanking, userRanking, tagRanking } = computeStats();

  const sakeTable = `
  <h3>酒ランキング（評価順）</h3>
  <table class="ranking-table">
    <thead><tr><th>#</th><th>酒名</th><th>酒蔵</th><th>平均</th><th>件数</th></tr></thead>
    <tbody>
    ${sakeRanking
      .slice(0, 50)
      .map(
        (sake, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${esc(sake.sakeName)}</td>
        <td><a href="#brewery-${sakeMap.get(sake.sakeId)?.brewery_id}" class="brewery-link">${esc(sake.breweryName)}</a></td>
        <td class="rating-cell">★ ${sake.average.toFixed(1)}</td>
        <td>${sake.count}</td>
      </tr>`,
      )
      .join('')}
    </tbody>
  </table>`;

  const userTable = `
  <h3>ユーザー別レビュー数</h3>
  <table class="ranking-table">
    <thead><tr><th>#</th><th>ユーザー</th><th>レビュー数</th></tr></thead>
    <tbody>
    ${userRanking
      .map(
        (user, index) => `
      <tr><td>${index + 1}</td><td>${esc(user.name)}</td><td>${user.count}</td></tr>`,
      )
      .join('')}
    </tbody>
  </table>`;

  const tagTable = `
  <h3>タグ使用頻度</h3>
  <div class="tag-stats">
    ${tagRanking.map(([tag, count]) => `<span class="tag-stat">${tagBadge(tag)} <span class="tag-count">×${count}</span></span>`).join('')}
  </div>`;

  return `${sakeTable}${userTable}${tagTable}`;
}

function generateHtml(): string {
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>酒ナビ アーカイブ</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
.container { max-width: 900px; margin: 0 auto; padding: 16px; }
header { background: #1e293b; color: white; padding: 20px 0; margin-bottom: 16px; }
header .container { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
header h1 { font-size: 1.4rem; }
.stats-summary { display: flex; gap: 16px; font-size: 0.85rem; opacity: 0.8; }
.generated { font-size: 0.75rem; opacity: 0.6; }

/* ナビ */
.tab-nav { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; position: sticky; top: 0; background: #f8fafc; padding: 8px 0; z-index: 10; }
.tab-btn { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; transition: all 0.15s; }
.tab-btn:hover { background: #f1f5f9; }
.tab-btn.active { background: #1e293b; color: white; border-color: #1e293b; }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* マップ */
.map-container { overflow-x: auto; margin-bottom: 16px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 8px; }
.map-inner { position: relative; }
.map-badge { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #d1d5db; border-radius: 8px; background: white; text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
.map-badge:hover { border-color: #3b82f6; transform: translate(-50%, -50%) scale(1.1); z-index: 5; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.map-badge-reviewed { border-color: #93c5fd; background: #eff6ff; }
.map-badge-id { position: absolute; top: 50%; transform: translateY(-50%); font-size: 0.7rem; font-family: monospace; color: #64748b; white-space: nowrap; }
.map-badge-name { font-size: 0.75rem; font-weight: 600; text-align: center; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.map-badge-rating { font-size: 0.7rem; color: #f59e0b; }
.map-badge-norating { font-size: 0.65rem; color: #94a3b8; }

/* 検索 */
.search-box { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 16px; }
.search-box:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

/* 酒蔵 */
.brewery-section { background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); scroll-margin-top: 60px; }
.brewery-title { font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.brewery-no { color: #64748b; font-size: 0.85rem; font-weight: normal; }

/* 酒 */
.sake-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
.sake-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.sake-name { font-weight: 600; }
.sake-type { font-size: 0.8rem; color: #64748b; }
.sake-avg { font-size: 0.85rem; color: #f59e0b; font-weight: 600; }
.badge { font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
.badge-limited { background: #fee2e2; color: #dc2626; }
.badge-category { background: #f3e8ff; color: #7c3aed; }
.badge-paid { background: #fef3c7; color: #d97706; }
.badge-custom { background: #dbeafe; color: #2563eb; }
.no-reviews { font-size: 0.8rem; color: #94a3b8; }

/* レビュー */
.reviews-list, .notes-list { margin-top: 8px; }
.review { border-top: 1px solid #f1f5f9; padding: 8px 0; }
.review-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.review-user { font-weight: 600; font-size: 0.85rem; color: #3b82f6; text-decoration: none; }
.review-user:hover { text-decoration: underline; }
.review-rating { font-size: 0.85rem; color: #f59e0b; }
.review-date { font-size: 0.75rem; color: #94a3b8; }
.review-tags { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.review-comment { margin-top: 4px; font-size: 0.85rem; color: #475569; white-space: pre-wrap; }

/* タグ */
.tag { display: inline-block; font-size: 0.75rem; padding: 1px 8px; border-radius: 9999px; border: 1px solid; }

/* ノート */
.notes-section { margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
.notes-heading { font-size: 0.85rem; color: #3b82f6; font-weight: 600; margin-bottom: 4px; }
.note { border-top: 1px solid #f1f5f9; padding: 8px 0; }
.note-user { font-weight: 600; font-size: 0.85rem; }
.note-date { font-size: 0.75rem; color: #94a3b8; margin-left: 8px; }
.note-comment { margin-top: 4px; font-size: 0.85rem; color: #475569; white-space: pre-wrap; }

/* タイムライン */
.timeline-item { background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.timeline-review { border-left: 3px solid #3b82f6; }
.timeline-note { border-left: 3px solid #10b981; }
.timeline-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.timeline-user { font-weight: 600; font-size: 0.9rem; color: #3b82f6; text-decoration: none; }
.timeline-user:hover { text-decoration: underline; }
.timeline-action { font-size: 0.8rem; color: #64748b; }
.timeline-date { font-size: 0.75rem; color: #94a3b8; margin-left: auto; }
.timeline-target { margin-top: 4px; font-size: 0.85rem; }
.timeline-target a { color: #3b82f6; text-decoration: none; }
.timeline-target a:hover { text-decoration: underline; }
.timeline-rating { font-size: 0.9rem; color: #f59e0b; margin-top: 4px; }
.timeline-tags { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.timeline-comment { margin-top: 4px; font-size: 0.85rem; color: #475569; white-space: pre-wrap; }

/* ユーザーレビュー */
.user-select-wrapper { margin-bottom: 16px; }
.user-select { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: white; }
.user-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

/* ランキング */
.ranking-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.ranking-table th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 0.8rem; color: #64748b; }
.ranking-table td { padding: 8px 12px; border-top: 1px solid #f1f5f9; font-size: 0.85rem; }
.ranking-table a { color: #3b82f6; text-decoration: none; }
.ranking-table a:hover { text-decoration: underline; }
.rating-cell { color: #f59e0b; font-weight: 600; }
.tag-stats { display: flex; gap: 12px; flex-wrap: wrap; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.tag-stat { display: flex; align-items: center; gap: 4px; }
.tag-count { font-size: 0.8rem; color: #64748b; }
h3 { margin: 16px 0 12px; font-size: 1rem; }
</style>
</head>
<body>
<header>
  <div class="container">
    <div>
      <h1>酒ナビ アーカイブ</h1>
      <div class="generated">生成日時: ${esc(now)}</div>
    </div>
    <div class="stats-summary">
      <span>${users.length}人</span>
      <span>${reviews.length}レビュー</span>
      <span>${breweryNotes.length}ノート</span>
      <span>${breweries.length}酒蔵</span>
      <span>${sakes.length}酒</span>
    </div>
  </div>
</header>
<div class="container">
  <div class="tab-nav">
    <button class="tab-btn active" data-tab="map">マップ</button>
    <button class="tab-btn" data-tab="breweries">酒蔵一覧</button>
    <button class="tab-btn" data-tab="timeline">タイムライン</button>
    <button class="tab-btn" data-tab="user-reviews">ユーザー別</button>
    <button class="tab-btn" data-tab="ranking">ランキング・統計</button>
  </div>

  <div id="tab-map" class="tab-content active">
    ${generateMap()}
  </div>

  <div id="tab-breweries" class="tab-content">
    <input type="text" class="search-box" placeholder="酒蔵名で検索..." id="brewery-search">
    ${breweries.map((brewery) => generateBrewerySection(brewery)).join('')}
  </div>

  <div id="tab-timeline" class="tab-content">
    ${generateTimeline()}
  </div>

  <div id="tab-user-reviews" class="tab-content">
    ${generateUserReviews()}
  </div>

  <div id="tab-ranking" class="tab-content">
    ${generateRanking()}
  </div>
</div>
<script>
// タブ切替
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
  const content = document.getElementById('tab-' + tabName);
  if (content) content.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// 酒蔵を開くときは検索をリセットする（絞り込みで対象が隠れたままスクロールしないように）
function resetBrewerySearch() {
  document.getElementById('brewery-search').value = '';
  document.querySelectorAll('.brewery-section').forEach(sec => { sec.style.display = ''; });
}

// 酒蔵リンク: タブ切替 + スクロール
document.addEventListener('click', (e) => {
  const link = e.target.closest('a.brewery-link');
  if (!link) return;
  e.preventDefault();
  const hash = link.getAttribute('href');
  if (!hash) return;
  resetBrewerySearch();
  switchTab('breweries');
  requestAnimationFrame(() => {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// マップバッジクリック: 酒蔵タブ + スクロール
document.addEventListener('click', (e) => {
  const badge = e.target.closest('a.map-badge');
  if (!badge) return;
  e.preventDefault();
  const hash = badge.getAttribute('href');
  if (!hash) return;
  resetBrewerySearch();
  switchTab('breweries');
  requestAnimationFrame(() => {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ユーザーリンク: ユーザー別タブに切替
document.addEventListener('click', (e) => {
  const link = e.target.closest('a.user-link');
  if (!link) return;
  e.preventDefault();
  const userId = link.dataset.userId;
  if (!userId) return;
  switchTab('user-reviews');
  const select = document.getElementById('user-select');
  if (select) {
    select.value = userId;
    select.dispatchEvent(new Event('change'));
  }
});

// 検索
document.getElementById('brewery-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.brewery-section').forEach(sec => {
    const name = sec.dataset.name.toLowerCase();
    sec.style.display = name.includes(q) ? '' : 'none';
  });
});

// ユーザー別レビュー切替
document.getElementById('user-select').addEventListener('change', (e) => {
  const userId = e.target.value;
  document.querySelectorAll('.user-reviews-section').forEach(sec => {
    sec.style.display = sec.dataset.userId === userId ? '' : 'none';
  });
});
</script>
</body>
</html>`;
}

const html = generateHtml();
// 表示を JST に揃えているので、出力ファイル名の年も JST で決める
const year = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(
  new Date(),
);
const outPath = join(DATA_DIR, `${year}.html`);
writeFileSync(outPath, html);
console.log(`Archive generated: ${outPath}`);
console.log(
  `Stats: ${users.length} users, ${reviews.length} reviews, ${breweryNotes.length} notes, ${breweries.length} breweries, ${sakes.length} sakes`,
);
