import { getAuth } from './auth';

const baseUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * APIリクエストのヘッダーにX-User-Idを自動付与
 */
function getHeaders(): HeadersInit {
  const auth = getAuth();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    headers['X-User-Id'] = auth.userId;
  }

  return headers;
}

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
 * レスポンスのエラーハンドリング
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(
      response.status,
      errorData.error || `リクエストエラー: ${response.statusText}`,
    );
  }
  return response.json();
}

// ========================================
// ユーザーAPI
// ========================================

export type User = {
  id: string;
  name: string;
  createdAt: string;
};

/**
 * ユーザー一覧取得
 */
export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${baseUrl}/api/users`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<User[]>(response);
}

/**
 * ユーザー登録
 */
export async function createUser(name: string): Promise<User> {
  const response = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  });
  return handleResponse<User>(response);
}

// ========================================
// 酒蔵API
// ========================================

export type Brewery = {
  breweryId: number;
  name: string;
  mapPositionX: number;
  mapPositionY: number;
  area: string | null;
};

export type BreweryWithRating = {
  breweryId: number;
  name: string;
  mapPositionX: number;
  mapPositionY: number;
  averageRating: number | null;
  hasUserReviewed: boolean;
};

export type Sake = {
  sakeId: number;
  name: string;
  type: string | null;
  isCustom: boolean;
  addedBy: string | null;
  isLimited: boolean;
  paidTastingPrice: number | null;
  category: string;
  createdAt: string;
  averageRating: number | null;
  reviews: Review[];
};

export type BreweryDetail = {
  brewery: Brewery;
  sakes: Sake[];
};

/**
 * 酒蔵一覧取得（マップ表示用）
 */
export async function getBreweries(): Promise<BreweryWithRating[]> {
  const response = await fetch(`${baseUrl}/api/breweries`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<BreweryWithRating[]>(response);
}

/**
 * 酒蔵詳細取得
 */
export async function getBreweryDetail(breweryId: number): Promise<BreweryDetail> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}`, {
    method: 'GET',
  });
  return handleResponse<BreweryDetail>(response);
}

// ========================================
// 酒蔵ノートAPI
// ========================================

export type BreweryNote = {
  noteId: number;
  userId: string;
  userName: string;
  breweryId: number;
  comment: string;
  createdAt: string;
};

/**
 * 酒蔵ノート一覧取得
 */
export async function getBreweryNotes(breweryId: number): Promise<BreweryNote[]> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/notes`, {
    method: 'GET',
  });
  return handleResponse<BreweryNote[]>(response);
}

/**
 * 酒蔵ノート投稿
 */
export async function createBreweryNote(breweryId: number, content: string): Promise<BreweryNote> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/notes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  return handleResponse<BreweryNote>(response);
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
    category?: string;
  },
): Promise<Sake> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/sakes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Sake>(response);
}

/**
 * 酒蔵ノート編集
 */
export async function updateBreweryNote(
  breweryId: number,
  noteId: number,
  content: string,
): Promise<BreweryNote> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/notes/${noteId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  return handleResponse<BreweryNote>(response);
}

/**
 * 酒蔵ノート削除
 */
export async function deleteBreweryNote(breweryId: number, noteId: number): Promise<void> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/notes/${noteId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<{ success: boolean }>(response);
}

// ========================================
// お酒API
// ========================================

export type Review = {
  id: number;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
};

export type SakeDetail = {
  id: number;
  breweryId: number;
  name: string;
  type: string | null;
  isCustom: boolean;
  addedBy: string | null;
  createdAt: string;
  avgRating: number | null;
  reviews: Review[];
};

/**
 * お酒詳細取得
 */
export async function getSakeDetail(sakeId: number): Promise<SakeDetail> {
  const response = await fetch(`${baseUrl}/api/sakes/${sakeId}`, {
    method: 'GET',
  });
  return handleResponse<SakeDetail>(response);
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
    category?: string;
  },
): Promise<Sake> {
  const response = await fetch(`${baseUrl}/api/sakes/${sakeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Sake>(response);
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
): Promise<Review> {
  const response = await fetch(`${baseUrl}/api/sakes/${sakeId}/reviews`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Review>(response);
}

/**
 * レビュー編集
 */
export async function updateReview(
  sakeId: number,
  reviewId: number,
  data: { rating: number; tags: string[]; comment?: string },
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/sakes/${sakeId}/reviews/${reviewId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  await handleResponse<{ id: number }>(response);
}

/**
 * レビュー削除
 */
export async function deleteReview(sakeId: number, reviewId: number): Promise<void> {
  const response = await fetch(`${baseUrl}/api/sakes/${sakeId}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<{ success: boolean }>(response);
}

// ========================================
// レビュー検索API
// ========================================

export type ReviewSearchItem = {
  reviewId: number;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string };
  sake: {
    id: number;
    name: string;
    type: string | null;
    isLimited: boolean;
    paidTastingPrice?: number;
  };
  brewery: { id: number; name: string };
};

export type ReviewSearchResponse = {
  items: ReviewSearchItem[];
  nextCursor: string | null;
};

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
  const searchParams = new URLSearchParams();
  if (params?.sort) searchParams.append('sort', params.sort);
  if (params?.tags && params.tags.length > 0) searchParams.append('tags', params.tags.join(','));
  if (params?.userId) searchParams.append('userId', params.userId);
  if (params?.cursor) searchParams.append('cursor', params.cursor);
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${baseUrl}/api/reviews${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, { method: 'GET' });
  return handleResponse<ReviewSearchResponse>(response);
}

// ========================================
// タイムラインAPI
// ========================================

export type TimelineReviewItem = {
  type: 'review';
  id: number;
  userName: string;
  createdAt: string;
  breweryId: number;
  sakeName: string;
  breweryName: string;
  rating: number;
  tags: string[];
  comment?: string;
  isLimited: boolean;
  paidTastingPrice?: number;
};

export type TimelineNoteItem = {
  type: 'brewery_note';
  id: number;
  userName: string;
  createdAt: string;
  breweryId: number;
  breweryName: string;
  content: string;
};

export type TimelineItem = TimelineReviewItem | TimelineNoteItem;

export type TimelineResponse = {
  items: TimelineItem[];
  nextCursor: string | null;
};

/**
 * タイムライン取得（ページネーション対応）
 */
export async function getTimeline(cursor?: string, limit?: number): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', limit.toString());

  const url = `${baseUrl}/api/timeline${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
  });
  return handleResponse<TimelineResponse>(response);
}

// ========================================
// ブックマークAPI
// ========================================

export type BookmarkedSake = {
  bookmarkId: number;
  sake: {
    sakeId: number;
    name: string;
    type: string | null;
    isLimited: boolean;
    paidTastingPrice: number | null;
    category: string | null;
  };
  brewery: {
    breweryId: number;
    name: string;
  };
  createdAt: string;
};

/**
 * ブックマーク一覧取得
 */
export async function getBookmarks(): Promise<BookmarkedSake[]> {
  const response = await fetch(`${baseUrl}/api/bookmarks`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<BookmarkedSake[]>(response);
}

/**
 * ブックマーク追加
 */
export async function addBookmark(sakeId: number): Promise<void> {
  const response = await fetch(`${baseUrl}/api/bookmarks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sakeId }),
  });
  await handleResponse<{ bookmarkId: number; sakeId: number }>(response);
}

/**
 * ブックマーク削除
 */
export async function removeBookmark(sakeId: number): Promise<void> {
  const response = await fetch(`${baseUrl}/api/bookmarks/${sakeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<{ success: boolean }>(response);
}
