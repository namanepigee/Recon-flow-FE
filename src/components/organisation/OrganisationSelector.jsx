import { useOrganisation } from '../../hooks/useOrganisation';

export default function OrganisationSelector() {
  const { activeOrganisation, memberships, selectOrganisation } =
    useOrganisation();

  if (memberships.length <= 1) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
        {activeOrganisation?.name ?? 'No organisation'}
      </span>
    );
  }

  return (
    <select
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
      value={activeOrganisation?.id ?? ''}
      onChange={(event) => selectOrganisation(event.target.value)}
    >
      {memberships.map((membership) => (
        <option key={membership.id} value={membership.organisation.id}>
          {membership.organisation.name}
        </option>
      ))}
    </select>
  );
}
