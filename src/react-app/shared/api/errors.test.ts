import { apiErrorStatus, throwApiError } from './errors';

describe('throwApiError', () => {
  it('status を載せた Error を投げる', () => {
    try {
      throwApiError({ status: 404 }, '見つかりませんでした');
      expect.unreachable('throw されるはず');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('message', '見つかりませんでした');
      expect(apiErrorStatus(error)).toBe(404);
    }
  });
});

describe('apiErrorStatus', () => {
  it('status が数値のときだけ返す', () => {
    expect(apiErrorStatus(Object.assign(new Error('boom'), { status: 500 }))).toBe(500);
    expect(apiErrorStatus(Object.assign(new Error('boom'), { status: '500' }))).toBeUndefined();
  });

  it('status を持たない値では undefined', () => {
    expect(apiErrorStatus(new Error('boom'))).toBeUndefined();
    expect(apiErrorStatus(undefined)).toBeUndefined();
    expect(apiErrorStatus(null)).toBeUndefined();
    expect(apiErrorStatus('boom')).toBeUndefined();
  });
});
