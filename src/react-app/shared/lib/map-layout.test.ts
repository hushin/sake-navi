import { mapPointFor, mapSize } from './map-layout';

describe('mapPointFor', () => {
  it('1 列 1 行が原点になる', () => {
    expect(mapPointFor(1, 1)).toEqual({ x: 90, y: 50 });
  });

  it('通路の余白は「その列・行を過ぎてから」入る', () => {
    // 2 列目・2 行目は通路の手前なので余白は入らない
    expect(mapPointFor(2, 2)).toEqual({ x: 170, y: 114 });
    // 3 列目で +55、3 行目で +20
    expect(mapPointFor(3, 3)).toEqual({ x: 305, y: 198 });
  });

  it.each([
    { label: '4 列目（通常の通路 1 本ぶん）', column: 4, row: 4, x: 385, y: 262 },
    { label: '5 列目（広い通路の次）', column: 5, row: 5, x: 570, y: 346 },
    { label: '8 列目', column: 8, row: 6, x: 865, y: 410 },
    { label: '11 列目（広い通路の次）', column: 11, row: 5, x: 1265, y: 346 },
    { label: '14 列目（最後の列）', column: 14, row: 6, x: 1560, y: 410 },
  ])('$label の座標', ({ column, row, x, y }) => {
    expect(mapPointFor(column, row)).toEqual({ x, y });
  });

  it('列と行は独立して効く', () => {
    const origin = mapPointFor(1, 1);
    expect(mapPointFor(1, 6).x).toBe(origin.x);
    expect(mapPointFor(14, 1).y).toBe(origin.y);
  });
});

describe('mapSize', () => {
  it('最後の列・行のバッジが収まる大きさになる', () => {
    // seed の酒蔵（14 列 6 行）は 1640 x 450 になる
    expect(mapSize([{ mapColumn: 14, mapRow: 6 }])).toEqual({ width: 1640, height: 450 });
  });

  it('順序や重複によらず最大の列・行で決まる', () => {
    expect(
      mapSize([
        { mapColumn: 3, mapRow: 2 },
        { mapColumn: 1, mapRow: 6 },
        { mapColumn: 3, mapRow: 2 },
      ]),
    ).toEqual(mapSize([{ mapColumn: 3, mapRow: 6 }]));
  });

  it('酒蔵が 1 件も無くても 1 マスぶんの大きさを返す', () => {
    expect(mapSize([])).toEqual({ width: 170, height: 90 });
  });
});
