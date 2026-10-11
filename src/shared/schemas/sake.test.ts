import { sakeEditSchema, toSakeUpdateInput } from './sake';

const formValues = {
  name: '北雪 大吟醸YK35',
  type: '',
  category: '清酒',
  isLimited: false,
  paidTastingPrice: '',
} as const;

describe('sakeEditSchema', () => {
  it('金額は空欄（未入力）を許す', () => {
    expect(sakeEditSchema.safeParse(formValues).success).toBe(true);
  });

  it('金額は数字だけを受け付ける', () => {
    expect(sakeEditSchema.safeParse({ ...formValues, paidTastingPrice: '500' }).success).toBe(true);
    expect(sakeEditSchema.safeParse({ ...formValues, paidTastingPrice: '500円' }).success).toBe(
      false,
    );
    expect(sakeEditSchema.safeParse({ ...formValues, paidTastingPrice: '0' }).success).toBe(false);
    expect(sakeEditSchema.safeParse({ ...formValues, paidTastingPrice: '-1' }).success).toBe(false);
  });

  it('名前は必須', () => {
    expect(sakeEditSchema.safeParse({ ...formValues, name: '  ' }).success).toBe(false);
  });
});

describe('toSakeUpdateInput', () => {
  it('空欄の種類と金額は null にする', () => {
    expect(toSakeUpdateInput({ ...formValues })).toEqual({
      name: '北雪 大吟醸YK35',
      type: null,
      category: '清酒',
      isLimited: false,
      paidTastingPrice: null,
    });
  });

  it('入力した値をそのまま API の入力に変換する', () => {
    expect(
      toSakeUpdateInput({
        ...formValues,
        type: '大吟醸',
        isLimited: true,
        paidTastingPrice: '500',
      }),
    ).toEqual({
      name: '北雪 大吟醸YK35',
      type: '大吟醸',
      category: '清酒',
      isLimited: true,
      paidTastingPrice: 500,
    });
  });
});
