/** API の失敗を HTTP status 付きの Error にする（4xx をリトライしない判定に使う） */
export function throwApiError(response: { status: number }, message: string): never {
  throw Object.assign(new Error(message), { status: response.status });
}

/**
 * Error から HTTP status を取り出す。
 *
 * `instanceof` で判定しないのは、chunk をまたぐとクラスの実体が分かれるため
 * （bootstrap / loader / 画面の chunk で別々にバンドルされうる）。
 */
export function apiErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}
