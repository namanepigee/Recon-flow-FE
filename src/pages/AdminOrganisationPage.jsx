import { useEffect, useState } from 'react';

import * as organisationApi from '../api/organisation';
import AppShell from '../components/layout/AppShell';
import LoadingState from '../components/common/LoadingState';

export default function AdminOrganisationPage() {
  const [organisation, setOrganisation] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const data = await organisationApi.getCurrentOrganisation();
    setOrganisation(data.organisation);
    setName(data.organisation.name);
  }

  useEffect(() => {
    load();
  }, []);

  if (!organisation) {
    return (
      <AppShell>
        <section className="p-8">
          <LoadingState />
        </section>
      </AppShell>
    );
  }

  async function save(event) {
    event.preventDefault();
    const data = await organisationApi.updateCurrentOrganisation({ name });
    setOrganisation(data.organisation);
    setMessage('Organisation updated.');
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-5 py-8">
        <form
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          onSubmit={save}
        >
          <h1 className="text-2xl font-bold">Organisation Settings</h1>
          {message && (
            <p className="mt-2 text-sm text-emerald-700">{message}</p>
          )}
          <label className="mt-6 block">
            <span className="text-sm font-semibold text-slate-700">Name</span>
            <input
              className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Slug</dt>
              <dd>{organisation.slug}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Status</dt>
              <dd>{organisation.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Active users</dt>
              <dd>{organisation.active_user_count}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Total memberships</dt>
              <dd>{organisation.total_membership_count}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Created</dt>
              <dd>{new Date(organisation.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Updated</dt>
              <dd>{new Date(organisation.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
          <button className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
            Save Organisation
          </button>
        </form>
      </section>
    </AppShell>
  );
}
