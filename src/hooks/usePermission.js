import { useOrganisation } from './useOrganisation';

export function usePermission() {
  const { permissions } = useOrganisation();
  const hasPermission = (code) => permissions.includes(code);
  const hasAnyPermission = (codes) => codes.some((code) => hasPermission(code));

  return { hasPermission, hasAnyPermission, permissions };
}
