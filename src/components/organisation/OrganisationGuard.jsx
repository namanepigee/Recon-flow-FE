import LoadingScreen from '../layout/LoadingScreen';
import { useOrganisation } from '../../hooks/useOrganisation';

export default function OrganisationGuard({ children }) {
  const { activeMembership, isLoading, memberships } = useOrganisation();

  if (isLoading) return <LoadingScreen />;
  if (!activeMembership && memberships.length === 0) return <LoadingScreen />;
  return children;
}
