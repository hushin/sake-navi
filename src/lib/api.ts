'use client';

import type { InferResponseType } from 'hono';
import { client } from './clients';

/**
 * APIエラーの型定義
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * エラーレスポンスから日本語メッセージを取得
 */
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `リクエストエラー: ${response.statusText}`;
  } catch {
    return `リクエストエラー: ${response.statusText}`;
  }
}

// ========================================
// ユーザーAPI
// ========================================

type UsersGetResponse = Exclude<InferResponseType<typeof client.api.users.$get>, { error: string }>;
export type User = UsersGetResponse[number];

/**
 * ユーザー一覧取得
 */
export async function getUsers(): Promise<User[]> {
  const res = await client.api.users.$get();

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * ユーザー登録
 */
export async function createUser(name: string): Promise<User> {
  const res = await client.api.users.$post({
    json: { name },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ========================================
// 酒蔵API
// ========================================

type BreweriesGetResponse = Exclude<
  InferResponseType<typeof client.api.breweries.$get>,
  { error: string }
>;
type BreweryDetailResponse = Exclude<
  InferResponseType<(typeof client.api.breweries)[':id']['$get']>,
  { error: string }
>;

export type BreweryWithRating = BreweriesGetResponse[number];
export type BreweryDetail = BreweryDetailResponse;
export type Brewery = BreweryDetail['brewery'];
export type Sake = BreweryDetail['sakes'][number];
export type Review = Sake['reviews'][number];

/**
 * 酒蔵一覧取得（マップ表示用）
 */
export async function getBreweries(): Promise<BreweryWithRating[]> {
  const res = await client.api.breweries.$get();

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * 酒蔵詳細取得
 */
export async function getBreweryDetail(breweryId: number): Promise<BreweryDetail> {
  const res = await client.api.breweries[':id'].$get({
    param: { id: String(breweryId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ========================================
// 酒蔵ノートAPI
// ========================================

type BreweryNotesGetResponse = Exclude<
  InferResponseType<(typeof client.api.breweries)[':id']['notes']['$get']>,
  { error: string }
>;
export type BreweryNote = BreweryNotesGetResponse[number];

/**
 * 酒蔵ノート一覧取得
 */
export async function getBreweryNotes(breweryId: number): Promise<BreweryNote[]> {
  const res = await client.api.breweries[':id'].notes.$get({
    param: { id: String(breweryId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * 酒蔵ノート投稿
 */
export async function createBreweryNote(breweryId: number, content: string): Promise<BreweryNote> {
  const res = await client.api.breweries[':id'].notes.$post({
    param: { id: String(breweryId) },
    json: { content },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * お酒を追加（自由入力）
 */
export async function addCustomSake(
  breweryId: number,
  data: {
    name: string;
    type?: string;
    isLimited?: boolean;
    paidTastingPrice?: number;
    category?: '清酒' | 'リキュール' | 'みりん' | 'その他';
  },
): Promise<Omit<Sake, 'averageRating' | 'reviews'>> {
  const res = await client.api.breweries[':id'].sakes.$post({
    param: { id: String(breweryId) },
    json: data,
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * 酒蔵ノート編集
 */
export async function updateBreweryNote(
  breweryId: number,
  noteId: number,
  content: string,
): Promise<BreweryNote> {
  const res = await client.api.breweries[':id'].notes[':noteId'].$put({
    param: { id: String(breweryId), noteId: String(noteId) },
    json: { content },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * 酒蔵ノート削除
 */
export async function deleteBreweryNote(breweryId: number, noteId: number): Promise<void> {
  const res = await client.api.breweries[':id'].notes[':noteId'].$delete({
    param: { id: String(breweryId), noteId: String(noteId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

// ========================================
// お酒API
// ========================================

type SakeDetailResponse = Exclude<
  InferResponseType<(typeof client.api.sakes)[':id']['$get']>,
  { error: string }
>;
export type SakeDetail = SakeDetailResponse;

/**
 * お酒詳細取得
 */
export async function getSakeDetail(sakeId: number): Promise<SakeDetail> {
  const res = await client.api.sakes[':id'].$get({
    param: { id: String(sakeId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * お酒編集（カスタム酒のみ）
 */
export async function updateSake(
  sakeId: number,
  data: {
    name: string;
    type?: string;
    isLimited?: boolean;
    paidTastingPrice?: number;
    category?: '清酒' | 'リキュール' | 'みりん' | 'その他';
  },
): Promise<Omit<Sake, 'averageRating' | 'reviews'>> {
  const res = await client.api.sakes[':id'].$put({
    param: { id: String(sakeId) },
    json: data,
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * レビュー投稿
 */
export async function createReview(
  sakeId: number,
  data: {
    rating: number;
    tags?: string[];
    comment?: string;
  },
): Promise<Omit<Review, 'user'>> {
  const res = await client.api.sakes[':id'].reviews.$post({
    param: { id: String(sakeId) },
    json: data,
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * レビュー編集
 */
export async function updateReview(
  sakeId: number,
  reviewId: number,
  data: { rating: number; tags: string[]; comment?: string },
): Promise<void> {
  const res = await client.api.sakes[':id'].reviews[':reviewId'].$put({
    param: { id: String(sakeId), reviewId: String(reviewId) },
    json: data,
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

/**
 * レビュー削除
 */
export async function deleteReview(sakeId: number, reviewId: number): Promise<void> {
  const res = await client.api.sakes[':id'].reviews[':reviewId'].$delete({
    param: { id: String(sakeId), reviewId: String(reviewId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

// ========================================
// 酒検索API
// ========================================

type SakesSearchResponse = Exclude<
  InferResponseType<typeof client.api.sakes.$get>,
  { error: string }
>;
export type SakeSearchResponse = SakesSearchResponse;
export type SakeSearchItem = SakeSearchResponse['items'][number];

/**
 * 酒検索（ページネーション対応）
 */
export async function searchSakes(params?: {
  q?: string;
  category?: string;
  isLimited?: boolean;
  hasPaidTasting?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<SakeSearchResponse> {
  const res = await client.api.sakes.$get({
    query: {
      q: params?.q,
      category: params?.category,
      isLimited: params?.isLimited ? 'true' : undefined,
      hasPaidTasting: params?.hasPaidTasting ? 'true' : undefined,
      cursor: params?.cursor,
      limit: params?.limit?.toString(),
    },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ========================================
// レビュー検索API
// ========================================

type ReviewsSearchResponse = Exclude<
  InferResponseType<typeof client.api.reviews.$get>,
  { error: string }
>;
export type ReviewSearchResponse = ReviewsSearchResponse;
export type ReviewSearchItem = ReviewSearchResponse['items'][number];

/**
 * レビュー検索（ページネーション対応）
 */
export async function getReviews(params?: {
  sort?: 'rating' | 'latest';
  tags?: string[];
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<ReviewSearchResponse> {
  const res = await client.api.reviews.$get({
    query: {
      sort: params?.sort,
      tags: params?.tags && params.tags.length > 0 ? params.tags.join(',') : undefined,
      userId: params?.userId,
      cursor: params?.cursor,
      limit: params?.limit?.toString(),
    },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ========================================
// タイムラインAPI
// ========================================

type TimelineGetResponse = Exclude<
  InferResponseType<typeof client.api.timeline.$get>,
  { error: string }
>;
export type TimelineResponse = TimelineGetResponse;
export type TimelineItem = TimelineResponse['items'][number];
export type TimelineReviewItem = Extract<TimelineItem, { type: 'review' }>;
export type TimelineNoteItem = Extract<TimelineItem, { type: 'brewery_note' }>;

/**
 * タイムライン取得（ページネーション対応）
 */
export async function getTimeline(cursor?: string, limit?: number): Promise<TimelineResponse> {
  const res = await client.api.timeline.$get({
    query: {
      cursor,
      limit: limit?.toString(),
    },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ========================================
// ブックマークAPI
// ========================================

type BookmarksGetResponse = Exclude<
  InferResponseType<typeof client.api.bookmarks.$get>,
  { error: string }
>;
export type BookmarkedSake = BookmarksGetResponse[number];

/**
 * ブックマーク一覧取得
 */
export async function getBookmarks(): Promise<BookmarkedSake[]> {
  const res = await client.api.bookmarks.$get();

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

/**
 * ブックマーク追加
 */
export async function addBookmark(sakeId: number): Promise<void> {
  const res = await client.api.bookmarks.$post({
    json: { sakeId },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

/**
 * ブックマーク削除
 */
export async function removeBookmark(sakeId: number): Promise<void> {
  const res = await client.api.bookmarks[':sakeId'].$delete({
    param: { sakeId: String(sakeId) },
  });

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}
