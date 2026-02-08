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
  boothNumber: number | null;
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
export async function addCustomSake(breweryId: number, name: string): Promise<Sake> {
  const response = await fetch(`${baseUrl}/api/breweries/${breweryId}/sakes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  });
  return handleResponse<Sake>(response);
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
};

/**
 * タイムライン取得
 */
export async function getTimeline(): Promise<TimelineResponse> {
  const response = await fetch(`${baseUrl}/api/timeline`, {
    method: 'GET',
  });
  return handleResponse<TimelineResponse>(response);
}
