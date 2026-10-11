/**
 * パスパラメータ（`:id` など）を数値にする。
 *
 * `zValidator('param', z.coerce.number())` を使うと Hono RPC の param の型が壊れるので、
 * route 側でこれを使って変換する。数値でない場合は null を返し、呼び出し側が 404 にする。
 */
export function parseIdParam(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  return Number(value);
}
