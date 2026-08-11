import { Navigate } from 'react-router-dom';

import { usePermission } from '../../hooks/usePermission';

export default function PermissionGuard({ permission, anyOf, children }) {
  const { hasPermission, hasAnyPermission } = usePermission();
  const allowed = anyOf ? hasAnyPermission(anyOf) : hasPermission(permission);

  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
