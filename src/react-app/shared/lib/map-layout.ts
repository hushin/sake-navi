/**
 * 会場マップの配置計算。
 *
 * `breweries.map_column` / `map_row` はパーセントではなく **1 始まりのグリッド列・行**で、
 * 列や行によって間隔が広いところがある（会場の通路の幅）。その分を足して px 座標にする。
 *
 * 旧実装は画面とアーカイブ HTML に同じ計算をコピーしていて二重管理になっていたので、
 * ここに 1 つだけ置いて両方から使う（アーカイブはタスク 9 から import する）。
 */

/** 左上（1 列 1 行）のバッジの中心 */
const ORIGIN_X = 90;
const ORIGIN_Y = 50;

/** バッジ（1 マス）の大きさ。会場の 1 ブース分 */
export const CELL_WIDTH = 80;
export const CELL_HEIGHT = 64;

/** 通路の幅。`after` 列目と次の列の間に `size` px を足す */
const COLUMN_GAPS = [
  { after: 2, size: 55 },
  { after: 4, size: 105 },
  { after: 6, size: 55 },
  { after: 8, size: 55 },
  { after: 10, size: 105 },
  { after: 12, size: 55 },
] as const;

const ROW_GAPS = [
  { after: 2, size: 20 },
  { after: 4, size: 20 },
] as const;

/** バッジが端で切れないようにする余白 */
const PADDING_X = 40;
const PADDING_Y = 8;

/** バッジの中心の座標（マップ左上からの px） */
export type MapPoint = {
  x: number;
  y: number;
};

function gapAfter(gaps: readonly { after: number; size: number }[], index: number): number {
  return gaps.reduce((total, gap) => (index > gap.after ? total + gap.size : total), 0);
}

/** グリッド（1 始まり）をマップ上の座標に変換する */
export function mapPointFor(column: number, row: number): MapPoint {
  return {
    x: (column - 1) * CELL_WIDTH + gapAfter(COLUMN_GAPS, column) + ORIGIN_X,
    y: (row - 1) * CELL_HEIGHT + gapAfter(ROW_GAPS, row) + ORIGIN_Y,
  };
}

/**
 * マップ全体（横スクロールする領域）の大きさ。
 * 最後の列・行のバッジがはみ出さない大きさにする。
 */
export function mapSize(breweries: readonly { mapColumn: number; mapRow: number }[]): {
  width: number;
  height: number;
} {
  const maxColumn = breweries.reduce((max, brewery) => Math.max(max, brewery.mapColumn), 1);
  const maxRow = breweries.reduce((max, brewery) => Math.max(max, brewery.mapRow), 1);

  return {
    width: mapPointFor(maxColumn, 1).x + CELL_WIDTH / 2 + PADDING_X,
    height: mapPointFor(1, maxRow).y + CELL_HEIGHT / 2 + PADDING_Y,
  };
}
