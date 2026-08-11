import { Navigate, useLocation } from 'react-router-dom';

import LoadingScreen from '../layout/LoadingScreen';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
