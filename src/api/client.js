import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setTokens,
} from '../services/tokenStorage';
import { getStoredOrganisationId } from '../services/organisationStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SKIP_REFRESH_PATHS = [
  '/auth/login/',
  '/auth/signup/',
  '/auth/refresh/',
  '/auth/logout/',
];
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function parseJson(response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError('The API returned an invalid response.', {
      status: response.status,
      data: null,
    });
  }
}

function buildUrl(path) {
  if (!API_BASE_URL) {
    throw new ApiError('Missing VITE_API_BASE_URL environment variable.');
  }

  return `${API_BASE_URL}${path}`;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refresh = getRefreshToken();

    if (!refresh) {
      clearTokens();
      throw new ApiError('Your session has expired. Please log in again.', {
        status: 401,
        data: null,
      });
    }

    refreshPromise = fetch(buildUrl('/auth/refresh/'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    })
      .then(async (response) => {
        const data = await parseJson(response);
        if (!response.ok) {
          throw new ApiError('Your session has expired. Please log in again.', {
            status: response.status,
            data,
          });
        }
        if (data.refresh) {
          setTokens({ access: data.access, refresh: data.refresh });
        } else {
          setAccessToken(data.access);
        }
        return data.access;
      })
      .catch((error) => {
        clearTokens();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    retryOnUnauthorized = true,
    body,
    headers,
    signal,
    ...fetchOptions
  } = options;
  const url = buildUrl(path);
  const shouldSkipRefresh = SKIP_REFRESH_PATHS.includes(path);
  const accessToken = auth ? getAccessToken() : null;
  const organisationId = auth ? getStoredOrganisationId() : null;
  const isFormData = body instanceof FormData;
  const requestHeaders = {
    Accept: 'application/json',
    ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(organisationId ? { 'X-Organisation-ID': organisationId } : {}),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      body,
      signal,
      ...fetchOptions,
    });
    const data = await parseJson(response);

    if (
      response.status === 401 &&
      auth &&
      retryOnUnauthorized &&
      !shouldSkipRefresh
    ) {
      const newAccessToken = await refreshAccessToken();
      return apiRequest(path, {
        auth,
        retryOnUnauthorized: false,
        body,
        headers: {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
        signal,
        ...fetchOptions,
      });
    }

    if (!response.ok) {
      throw new ApiError(
        data?.detail ||
          data?.errors?.non_field_errors?.[0] ||
          'The API request failed.',
        {
          status: response.status,
          data,
        },
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError('Unable to reach the API. Please try again.', {
      status: 0,
      data: null,
    });
  }
}
