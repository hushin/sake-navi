import { hc } from 'hono/client';
import type { AppType } from '../server/index';
import { getAuth } from './auth';

// X-User-Id ヘッダーを自動付与するカスタム fetch
const customFetch: typeof fetch = (input, init) => {
  const auth = getAuth();
  const headers = new Headers(init?.headers);

  if (auth) {
    headers.set('X-User-Id', auth.userId);
  }

  return fetch(input, { ...init, headers });
};

export const client = hc<AppType>('/', { fetch: customFetch });
