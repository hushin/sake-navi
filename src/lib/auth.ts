"use client";

/**
 * localStorage認証ヘルパー
 * ブラウザ環境でのみ動作する
 */

const USER_ID_KEY = "sake-navi-user-id";
const USER_NAME_KEY = "sake-navi-user-name";

/**
 * 認証情報の型
 */
export type AuthInfo = {
  userId: string;
  userName: string;
};

/**
 * localStorageが利用可能かチェック
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const test = "__test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * ユーザーIDを保存
 */
export function saveUserId(userId: string): void {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available");
    return;
  }
  localStorage.setItem(USER_ID_KEY, userId);
}

/**
 * ユーザーIDを取得
 */
export function getUserId(): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  return localStorage.getItem(USER_ID_KEY);
}

/**
 * ユーザー名を保存
 */
export function saveUserName(userName: string): void {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available");
    return;
  }
  localStorage.setItem(USER_NAME_KEY, userName);
}

/**
 * ユーザー名を取得
 */
export function getUserName(): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  return localStorage.getItem(USER_NAME_KEY);
}

/**
 * 認証情報を保存（userIdとuserName両方）
 */
export function saveAuth(userId: string, userName: string): void {
  saveUserId(userId);
  saveUserName(userName);
}

/**
 * 認証情報を取得
 */
export function getAuth(): AuthInfo | null {
  const userId = getUserId();
  const userName = getUserName();

  if (!userId || !userName) {
    return null;
  }

  return {
    userId,
    userName,
  };
}

/**
 * 認証情報を削除
 */
export function clearAuth(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

/**
 * 認証済みかどうかチェック
 */
export function isAuthenticated(): boolean {
  return getAuth() !== null;
}
