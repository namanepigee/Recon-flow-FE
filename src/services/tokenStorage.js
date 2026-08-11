const ACCESS_TOKEN_KEY = 'reconflow.accessToken';
const REFRESH_TOKEN_KEY = 'reconflow.refreshToken';

let memoryAccessToken = null;

export function getAccessToken() {
  return memoryAccessToken ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens) {
  memoryAccessToken = tokens.access;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function setAccessToken(accessToken) {
  memoryAccessToken = accessToken;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
