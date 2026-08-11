import { useContext } from 'react';

import { OrganisationContext } from '../context/organisationContextValue';

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error(
      'useOrganisation must be used inside OrganisationProvider.',
    );
  }
  return context;
}
