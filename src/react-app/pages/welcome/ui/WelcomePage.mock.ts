import { HttpResponse, http, type RequestHandler } from 'msw';

/**
 * `authClient.updateUser` は better-auth の `/update-user` を叩く。
 * Hono の route ではないので `createHandler` は使えない。
 */
export const updateUserHandlers = {
  success: [http.post('/api/auth/update-user', () => HttpResponse.json({ status: true }))],
  error: [
    http.post('/api/auth/update-user', () =>
      HttpResponse.json({ message: 'ニックネームを登録できませんでした' }, { status: 400 }),
    ),
  ],
} as const satisfies Record<string, RequestHandler[]>;
