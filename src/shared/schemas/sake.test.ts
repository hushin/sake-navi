import {
  PAID_TASTING_PRICE_UNDETERMINED,
  parsePaidTasting,
  sakeEditSchema,
  toSakeEditInput,
  toSakeUpdateInput,
} from './sake';

const formValues = {
  name: '北雪 大吟醸YK35',
  type: '',
  category: '清酒',
  isLimited: false,
  hasPaidTasting: false,
  paidTastingPrice: '',
} as const;

const storedSake = {
  name: '北雪 大吟醸YK35',
  type: null,
  category: '清酒',
  isLimited: false,
  paidTastingPrice: null as number | null,
};

describe('parsePaidTasting', () => {
  it('null は「有料試飲なし」', () => {
    expect(parsePaidTasting(null)).toEqual({ hasPaidTasting: false, price: null });
  });

  it('7 は「有料試飲あり・金額は未確認」', () => {
    expect(parsePaidTasting(PAID_TASTING_PRICE_UNDETERMINED)).toEqual({
      hasPaidTasting: true,
      price: null,
    });
  });

  it('実額はそのまま金額として扱う', () => {
    expect(parsePaidTasting(500)).toEqual({ hasPaidTasting: true, price: 500 });
  });
});

describe('toSakeEditInput', () => {
  it('金額未確認の印（7）はチェックだけ入れて金額は空にする', () => {
    expect(
      toSakeEditInput({ ...storedSake, paidTastingPrice: PAID_TASTING_PRICE_UNDETERMINED }),
    ).toEqual({ ...formValues, hasPaidTasting: true, paidTastingPrice: '' });
  });

  it('実額は金額欄に入れる', () => {
    expect(toSakeEditInput({ ...storedSake, paidTastingPrice: 500 })).toEqual({
      ...formValues,
      hasPaidTasting: true,
      paidTastingPrice: '500',
    });
  });

  it('null はチェックなし', () => {
    expect(toSakeEditInput({ ...storedSake })).toEqual({ ...formValues });
  });
});

describe('toSakeUpdateInput', () => {
  it('チェックなしなら金額は null', () => {
    expect(toSakeUpdateInput({ ...formValues })).toMatchObject({ paidTastingPrice: null });
  });

  it('チェックなしなら、金額が入っていても null にする', () => {
    expect(toSakeUpdateInput({ ...formValues, paidTastingPrice: '500' })).toMatchObject({
      paidTastingPrice: null,
    });
  });

  it('チェックだけなら金額未確認の 7 を保存する', () => {
    expect(toSakeUpdateInput({ ...formValues, hasPaidTasting: true })).toMatchObject({
      paidTastingPrice: PAID_TASTING_PRICE_UNDETERMINED,
    });
  });

  it('金額を入れたらその額を保存する', () => {
    expect(
      toSakeUpdateInput({ ...formValues, hasPaidTasting: true, paidTastingPrice: '500' }),
    ).toMatchObject({ paidTastingPrice: 500 });
  });

  it('空欄の種類は null にする', () => {
    expect(toSakeUpdateInput({ ...formValues, type: '大吟醸' })).toMatchObject({ type: '大吟醸' });
    expect(toSakeUpdateInput({ ...formValues })).toMatchObject({ type: null });
  });
});

describe('sakeEditSchema', () => {
  it('チェックなしなら金額は空でよい', () => {
    expect(sakeEditSchema.safeParse({ ...formValues }).success).toBe(true);
  });

  it('チェックありで金額が空でもよい（金額未確認）', () => {
    expect(
      sakeEditSchema.safeParse({ ...formValues, hasPaidTasting: true, paidTastingPrice: '' })
        .success,
    ).toBe(true);
  });

  it('金額は数字だけを受け付ける', () => {
    const withPrice = { ...formValues, hasPaidTasting: true };
    expect(sakeEditSchema.safeParse({ ...withPrice, paidTastingPrice: '500' }).success).toBe(true);
    expect(sakeEditSchema.safeParse({ ...withPrice, paidTastingPrice: '500円' }).success).toBe(
      false,
    );
    expect(sakeEditSchema.safeParse({ ...withPrice, paidTastingPrice: '0' }).success).toBe(false);
    expect(sakeEditSchema.safeParse({ ...withPrice, paidTastingPrice: '-1' }).success).toBe(false);
  });

  it('名前は必須', () => {
    expect(sakeEditSchema.safeParse({ ...formValues, name: '  ' }).success).toBe(false);
  });
});
