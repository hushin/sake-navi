import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from '@/react-app/shared/lib';

export type BreweryListItem = InferResponseType<
  (typeof client.api.breweries)['$get'],
  200
>['items'][number];

/**
 * マップの story 用の酒蔵。実際の会場（14 列 6 行）だと広すぎるので、
 * 端の酒蔵が分かる程度に散らした小さめの配置にしてある。
 */
export const breweryFixtures: BreweryListItem[] = [
  {
    id: 82,
    name: '北雪酒造',
    mapColumn: 1,
    mapRow: 1,
    area: 'Upper Pink',
    reviewCount: 3,
    averageRating: 4.5,
    hasUserReviewed: true,
  },
  {
    id: 31,
    name: '八海醸造',
    mapColumn: 3,
    mapRow: 2,
    area: 'Upper Pink',
    reviewCount: 1,
    averageRating: 3,
    hasUserReviewed: false,
  },
  {
    id: 1,
    name: '関原酒造',
    mapColumn: 5,
    mapRow: 4,
    area: 'Lower Green',
    reviewCount: 0,
    averageRating: null,
    hasUserReviewed: false,
  },
  {
    id: 14,
    name: '阿部酒造',
    mapColumn: 7,
    mapRow: 6,
    area: 'Lower Green',
    reviewCount: 2,
    averageRating: 4,
    hasUserReviewed: true,
  },
];

const successHandlers = [
  createHandler({ path: '/api/breweries', method: '$get' })(() => ({
    status: 200,
    output: { items: breweryFixtures },
  })),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/breweries', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: { items: breweryFixtures } };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/breweries', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const mapHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
