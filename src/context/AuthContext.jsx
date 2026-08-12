import { useCallback, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/auth';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../services/tokenStorage';
import { AuthContext } from './authContextValue';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    const data = await authApi.getCurrentUser();
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!getAccessToken() && !getRefreshToken()) {
        clearTokens();
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const data = await authApi.getCurrentUser();
        if (isMounted) setUser(data.user);
      } catch {
        clearTokens();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await authApi.signup(payload);
    setTokens(data.tokens);
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const data = await authApi.login(payload);
    setTokens(data.tokens, { rememberMe: payload.remember_me });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh && getAccessToken()) {
        await authApi.logout(refresh);
      }
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [isInitializing, login, logout, refreshUser, signup, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
