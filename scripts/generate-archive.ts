/**
 * ダンプしたJSONデータから静的HTMLアーカイブを生成するスクリプト
 * Usage: node --experimental-strip-types scripts/generate-archive.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'dist', 'archive');

// --- データ読み込み ---
function loadJson<T>(name: string): T[] {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf-8'));
}

interface User {
  user_id: string;
  name: string;
  created_at: string;
}
interface Brewery {
  brewery_id: number;
  name: string;
  map_position_x: number;
  map_position_y: number;
  area: string | null;
}
interface Sake {
  sake_id: number;
  brewery_id: number;
  name: string;
  type: string | null;
  is_custom: number;
  added_by: string | null;
  is_limited: number;
  paid_tasting_price: number | null;
  category: string | null;
  created_at: string;
}
interface Review {
  review_id: number;
  user_id: string;
  sake_id: number;
  rating: number;
  tags: string;
  comment: string | null;
  created_at: string;
}
interface BreweryNote {
  note_id: number;
  user_id: string;
  brewery_id: number;
  comment: string;
  created_at: string;
}

const users = loadJson<User>('users');
const breweries = loadJson<Brewery>('breweries');
const sakes = loadJson<Sake>('sakes');
const reviews = loadJson<Review>('reviews');
const breweryNotes = loadJson<BreweryNote>('brewery_notes');

// --- ルックアップ ---
const userMap = new Map(users.map((u) => [u.user_id, u.name]));
const breweryMap = new Map(breweries.map((b) => [b.brewery_id, b]));
const sakeMap = new Map(sakes.map((s) => [s.sake_id, s]));

// グループ化
function groupBy<T>(arr: T[], key: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function groupByStr<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

const sakesByBrewery = groupBy(sakes, (s) => s.brewery_id);
const reviewsBySake = groupBy(reviews, (r) => r.sake_id);
const notesByBrewery = groupBy(breweryNotes, (n) => n.brewery_id);
const reviewsByUser = groupByStr(reviews, (r) => r.user_id);

// --- ユーティリティ ---
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateJST(iso: string): string {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jst.getUTCDate()).padStart(2, '0');
  const hh = String(jst.getUTCHours()).padStart(2, '0');
  const mi = String(jst.getUTCMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

function parseTags(raw: string | null | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> =
  {
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
  const c = TAG_COLORS[tag] || {
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
  };
  return `<span class="tag" style="background:${c.bg};color:${c.text};border-color:${c.border}">${esc(tag)}</span>`;
}

// --- マップ生成 ---
function generateMap(): string {
  // src/app/map/page.tsx のレイアウトロジックを再現
  const START_X = 90;
  const START_Y = 50;
  const CELL_W = 80;
  const CELL_H = 64;
  const GAP_X = 55;
  const GAP_X_LARGE = 105;
  const GAP_Y = 20;

  const COL_GAPS = [
    { after: 2, size: GAP_X },
    { after: 4, size: GAP_X_LARGE },
    { after: 6, size: GAP_X },
    { after: 8, size: GAP_X },
    { after: 10, size: GAP_X_LARGE },
    { after: 12, size: GAP_X },
  ];
  const ROW_GAPS = [
    { after: 2, size: GAP_Y },
    { after: 4, size: GAP_Y },
  ];

  // 酒蔵ごとの平均評価を計算
  const breweryAvg = new Map<number, number>();
  for (const brewery of breweries) {
    const bSakes = sakesByBrewery.get(brewery.brewery_id) ?? [];
    const allRevs = bSakes.flatMap(
      (s) => reviewsBySake.get(s.sake_id) ?? [],
    );
    if (allRevs.length > 0) {
      breweryAvg.set(
        brewery.brewery_id,
        allRevs.reduce((sum, r) => sum + r.rating, 0) / allRevs.length,
      );
    }
  }

  const badges = breweries
    .map((b) => {
      const col = b.map_position_x;
      const row = b.map_position_y;
      const extraX = COL_GAPS.filter((g) => col > g.after).reduce(
        (sum, g) => sum + g.size,
        0,
      );
      const extraY = ROW_GAPS.filter((g) => row > g.after).reduce(
        (sum, g) => sum + g.size,
        0,
      );
      const left = (col - 1) * CELL_W + extraX + START_X;
      const top = (row - 1) * CELL_H + extraY + START_Y;
      const avg = breweryAvg.get(b.brewery_id);
      const hasReviews = avg !== undefined;

      return `<a href="#brewery-${b.brewery_id}" class="map-badge ${hasReviews ? 'map-badge-reviewed' : ''}" style="left:${left}px;top:${top}px;width:${CELL_W}px;height:${CELL_H}px" data-brewery-id="${b.brewery_id}">
        <div class="map-badge-id" style="${col % 2 === 1 ? 'right:100%;margin-right:4px' : 'left:100%;margin-left:4px'}">${b.brewery_id}</div>
        <div class="map-badge-name">${esc(b.name)}</div>
        ${avg !== undefined ? `<div class="map-badge-rating">★ ${avg.toFixed(1)}</div>` : '<div class="map-badge-norating">未評価</div>'}
      </a>`;
    })
    .join('');

  // マップの幅・高さを計算
  const maxCol = Math.max(...breweries.map((b) => b.map_position_x));
  const maxRow = Math.max(...breweries.map((b) => b.map_position_y));
  const totalExtraX = COL_GAPS.filter((g) => maxCol > g.after).reduce(
    (sum, g) => sum + g.size,
    0,
  );
  const totalExtraY = ROW_GAPS.filter((g) => maxRow > g.after).reduce(
    (sum, g) => sum + g.size,
    0,
  );
  const mapWidth = maxCol * CELL_W + totalExtraX + START_X + CELL_W;
  const mapHeight = maxRow * CELL_H + totalExtraY + START_Y + CELL_H;

  return `<div class="map-container"><div class="map-inner" style="width:${mapWidth}px;height:${mapHeight}px">${badges}</div></div>`;
}

// --- 統計計算 ---
function computeStats() {
  const sakeRanking: {
    sakeId: number;
    sakeName: string;
    breweryName: string;
    avg: number;
    count: number;
  }[] = [];
  for (const [sakeId, revs] of reviewsBySake) {
    if (revs.length === 0) continue;
    const sake = sakeMap.get(sakeId);
    if (!sake) continue;
    const brewery = breweryMap.get(sake.brewery_id);
    const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length;
    sakeRanking.push({
      sakeId,
      sakeName: sake.name,
      breweryName: brewery?.name ?? '不明',
      avg,
      count: revs.length,
    });
  }
  sakeRanking.sort((a, b) => b.avg - a.avg || b.count - a.count);

  const userReviewCount = new Map<string, number>();
  for (const r of reviews) {
    const name = userMap.get(r.user_id) ?? '不明';
    userReviewCount.set(name, (userReviewCount.get(name) ?? 0) + 1);
  }
  const userRanking = [...userReviewCount.entries()].sort(
    (a, b) => b[1] - a[1],
  );

  const tagCount = new Map<string, number>();
  for (const r of reviews) {
    for (const tag of parseTags(r.tags)) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const tagRanking = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);

  return { sakeRanking, userRanking, tagRanking };
}

// --- HTML生成 ---
function generateBrewerySection(brewery: Brewery): string {
  const bSakes = sakesByBrewery.get(brewery.brewery_id) ?? [];
  const bNotes = notesByBrewery.get(brewery.brewery_id) ?? [];

  const sakesHtml = bSakes
    .map((sake) => {
      const revs = reviewsBySake.get(sake.sake_id) ?? [];
      const avg =
        revs.length > 0
          ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1)
          : null;

      const badges: string[] = [];
      if (sake.is_limited)
        badges.push('<span class="badge badge-limited">限定</span>');
      if (sake.category && sake.category !== '清酒')
        badges.push(
          `<span class="badge badge-category">${esc(sake.category)}</span>`,
        );
      if (sake.paid_tasting_price)
        badges.push(
          `<span class="badge badge-paid">有料 ¥${sake.paid_tasting_price}</span>`,
        );
      if (sake.is_custom)
        badges.push('<span class="badge badge-custom">ユーザー追加</span>');

      const reviewsHtml =
        revs.length > 0
          ? `<div class="reviews-list">${revs
              .map(
                (r) => `
            <div class="review">
              <div class="review-header">
                <a href="#" class="review-user user-link" data-user-id="${esc(r.user_id)}">${esc(userMap.get(r.user_id) ?? '不明')}</a>
                <span class="review-rating">${stars(r.rating)}</span>
                <span class="review-date">${formatDateJST(r.created_at)}</span>
              </div>
              ${parseTags(r.tags).length > 0 ? `<div class="review-tags">${parseTags(r.tags).map(tagBadge).join('')}</div>` : ''}
              ${r.comment ? `<div class="review-comment">${esc(r.comment)}</div>` : ''}
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
          ${avg ? `<span class="sake-avg">★ ${avg}</span>` : ''}
        </div>
        ${reviewsHtml}
      </div>`;
    })
    .join('');

  const notesHtml =
    bNotes.length > 0
      ? `<div class="notes-section">
      <div class="notes-heading">酒蔵ノート (${bNotes.length}件)</div>
      <div class="notes-list">${bNotes
        .map(
          (n) => `
        <div class="note">
          <span class="note-user">${esc(userMap.get(n.user_id) ?? '不明')}</span>
          <span class="note-date">${formatDateJST(n.created_at)}</span>
          <div class="note-comment">${esc(n.comment)}</div>
        </div>`,
        )
        .join('')}
      </div>
    </div>`
      : '';

  return `
  <div class="brewery-section" id="brewery-${brewery.brewery_id}" data-name="${esc(brewery.name)}">
    <h3 class="brewery-title">
      <span class="brewery-no">No.${brewery.brewery_id}</span>
      ${esc(brewery.name)}
    </h3>
    ${sakesHtml}
    ${notesHtml}
  </div>`;
}

function generateTimeline(): string {
  type TimelineItem = { time: string; html: string };
  const items: TimelineItem[] = [];

  for (const r of reviews) {
    const sake = sakeMap.get(r.sake_id);
    const brewery = sake ? breweryMap.get(sake.brewery_id) : null;
    items.push({
      time: r.created_at,
      html: `
      <div class="timeline-item timeline-review">
        <div class="timeline-header">
          <a href="#" class="timeline-user user-link" data-user-id="${esc(r.user_id)}">${esc(userMap.get(r.user_id) ?? '不明')}</a>
          <span class="timeline-action">がレビュー</span>
          <span class="timeline-date">${formatDateJST(r.created_at)}</span>
        </div>
        <div class="timeline-target">
          <a href="#brewery-${sake?.brewery_id ?? 0}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a> / ${esc(sake?.name ?? '不明')}
        </div>
        <div class="timeline-rating">${stars(r.rating)}</div>
        ${parseTags(r.tags).length > 0 ? `<div class="timeline-tags">${parseTags(r.tags).map(tagBadge).join('')}</div>` : ''}
        ${r.comment ? `<div class="timeline-comment">${esc(r.comment)}</div>` : ''}
      </div>`,
    });
  }

  for (const n of breweryNotes) {
    const brewery = breweryMap.get(n.brewery_id);
    items.push({
      time: n.created_at,
      html: `
      <div class="timeline-item timeline-note">
        <div class="timeline-header">
          <a href="#" class="timeline-user user-link" data-user-id="${esc(n.user_id)}">${esc(userMap.get(n.user_id) ?? '不明')}</a>
          <span class="timeline-action">がノート投稿</span>
          <span class="timeline-date">${formatDateJST(n.created_at)}</span>
        </div>
        <div class="timeline-target">
          <a href="#brewery-${n.brewery_id}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a>
        </div>
        <div class="timeline-comment">${esc(n.comment)}</div>
      </div>`,
    });
  }

  items.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  return items.map((i) => i.html).join('');
}

function generateUserReviews(): string {
  // ユーザーセレクター + レビュー一覧
  const userOptions = users
    .map(
      (u) =>
        `<option value="${esc(u.user_id)}">${esc(u.name)} (${reviewsByUser.get(u.user_id)?.length ?? 0}件)</option>`,
    )
    .join('');

  // 各ユーザーのレビューを時系列順でプリレンダリング
  const userSections = users
    .map((u) => {
      const userRevs = reviewsByUser.get(u.user_id) ?? [];
      // 時系列順（新しい順）
      const sorted = [...userRevs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      if (sorted.length === 0) {
        return `<div class="user-reviews-section" data-user-id="${esc(u.user_id)}" style="display:none">
          <div class="no-reviews">レビューなし</div>
        </div>`;
      }
      return `<div class="user-reviews-section" data-user-id="${esc(u.user_id)}" style="display:none">
        ${sorted
          .map((r) => {
            const sake = sakeMap.get(r.sake_id);
            const brewery = sake ? breweryMap.get(sake.brewery_id) : null;
            return `
          <div class="timeline-item timeline-review">
            <div class="timeline-header">
              <span class="timeline-date">${formatDateJST(r.created_at)}</span>
            </div>
            <div class="timeline-target">
              <a href="#brewery-${sake?.brewery_id ?? 0}" class="brewery-link">${esc(brewery?.name ?? '不明')}</a> / ${esc(sake?.name ?? '不明')}
            </div>
            <div class="timeline-rating">${stars(r.rating)}</div>
            ${parseTags(r.tags).length > 0 ? `<div class="timeline-tags">${parseTags(r.tags).map(tagBadge).join('')}</div>` : ''}
            ${r.comment ? `<div class="timeline-comment">${esc(r.comment)}</div>` : ''}
          </div>`;
          })
          .join('')}
      </div>`;
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
        (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(s.sakeName)}</td>
        <td><a href="#brewery-${sakeMap.get(s.sakeId)?.brewery_id}" class="brewery-link">${esc(s.breweryName)}</a></td>
        <td class="rating-cell">★ ${s.avg.toFixed(1)}</td>
        <td>${s.count}</td>
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
        ([name, count], i) => `
      <tr><td>${i + 1}</td><td>${esc(name)}</td><td>${count}</td></tr>`,
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

function generateHTML(): string {
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const mapHtml = generateMap();
  const breweryListHtml = breweries
    .map((b) => generateBrewerySection(b))
    .join('');
  const timelineHtml = generateTimeline();
  const userReviewsHtml = generateUserReviews();
  const rankingHtml = generateRanking();

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
    ${mapHtml}
  </div>

  <div id="tab-breweries" class="tab-content">
    <input type="text" class="search-box" placeholder="酒蔵名で検索..." id="brewery-search">
    ${breweryListHtml}
  </div>

  <div id="tab-timeline" class="tab-content">
    ${timelineHtml}
  </div>

  <div id="tab-user-reviews" class="tab-content">
    ${userReviewsHtml}
  </div>

  <div id="tab-ranking" class="tab-content">
    ${rankingHtml}
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

// 酒蔵リンク: タブ切替 + スクロール
document.addEventListener('click', (e) => {
  const link = e.target.closest('a.brewery-link');
  if (!link) return;
  e.preventDefault();
  const hash = link.getAttribute('href');
  if (!hash) return;
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

// --- 出力 ---
const html = generateHTML();
const outPath = join(DATA_DIR, 'index.html');
writeFileSync(outPath, html);
console.log(`Archive generated: ${outPath}`);
console.log(
  `Stats: ${users.length} users, ${reviews.length} reviews, ${breweryNotes.length} notes, ${breweries.length} breweries, ${sakes.length} sakes`,
);
