import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearStoredOrganisationId,
  getStoredOrganisationId,
  setStoredOrganisationId,
} from '../services/organisationStorage';
import * as organisationApi from '../api/organisation';
import { useAuth } from '../hooks/useAuth';
import { OrganisationContext } from './organisationContextValue';

export function OrganisationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshOrganisations = useCallback(async () => {
    if (!isAuthenticated) {
      setMemberships([]);
      setActiveMembership(null);
      clearStoredOrganisationId();
      return;
    }
    setIsLoading(true);
    try {
      const data = await organisationApi.listOrganisations();
      let nextMemberships = data.memberships ?? [];
      if (nextMemberships.length === 0) {
        const created = await organisationApi.createOrganisation({
          name: 'My Organisation',
        });
        nextMemberships = [created.membership];
      }
      setMemberships(nextMemberships);
      const storedId = getStoredOrganisationId();
      const selected =
        nextMemberships.find((item) => item.organisation.id === storedId) ??
        nextMemberships.find((item) => item.is_active) ??
        nextMemberships[0] ??
        null;
      if (selected) {
        setStoredOrganisationId(selected.organisation.id);
      } else {
        clearStoredOrganisationId();
      }
      setActiveMembership(selected);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshOrganisations();
  }, [refreshOrganisations]);

  const selectOrganisation = useCallback(
    (organisationId) => {
      const membership = memberships.find(
        (item) => item.organisation.id === organisationId,
      );
      if (!membership) {
        clearStoredOrganisationId();
        setActiveMembership(null);
        return;
      }
      setStoredOrganisationId(organisationId);
      setActiveMembership(membership);
    },
    [memberships],
  );

  const value = useMemo(
    () => ({
      memberships,
      activeMembership,
      activeOrganisation: activeMembership?.organisation ?? null,
      permissions: activeMembership?.effective_permissions ?? [],
      isLoading,
      refreshOrganisations,
      selectOrganisation,
    }),
    [
      activeMembership,
      isLoading,
      memberships,
      refreshOrganisations,
      selectOrganisation,
    ],
  );

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
}
