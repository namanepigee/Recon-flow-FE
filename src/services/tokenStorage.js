const ACCESS_TOKEN_KEY = 'reconflow.accessToken';
const REFRESH_TOKEN_KEY = 'reconflow.refreshToken';
const REMEMBER_ME_KEY = 'reconflow.rememberMe';

let memoryAccessToken = null;

export function getAccessToken() {
  return memoryAccessToken ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return (
    window.localStorage.getItem(REFRESH_TOKEN_KEY) ??
    window.sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function getRememberMePreference() {
  return window.localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function setTokens(
  tokens,
  { rememberMe = getRememberMePreference() } = {},
) {
  memoryAccessToken = tokens.access;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  if (rememberMe) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    window.localStorage.setItem(REMEMBER_ME_KEY, 'true');
  } else {
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    window.localStorage.removeItem(REMEMBER_ME_KEY);
  }
}

export function setAccessToken(accessToken) {
  memoryAccessToken = accessToken;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(REMEMBER_ME_KEY);
}
