import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import * as organisationApi from '../api/organisation';
import Logo from '../components/common/Logo';
import { useOrganisation } from '../hooks/useOrganisation';

export default function OrganisationOnboardingPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { refreshOrganisations } = useOrganisation();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Organisation name is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await organisationApi.createOrganisation({ name: name.trim() });
      await refreshOrganisations();
      navigate('/', { replace: true });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <form
        className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200"
        onSubmit={handleSubmit}
      >
        <Logo />
        <h1 className="mt-8 text-3xl font-bold text-slate-950">
          Create your Organisation
        </h1>
        <p className="mt-3 text-slate-600">
          This Organisation will own your future invoices, bank transactions,
          reconciliations, users, permissions and audit history.
        </p>
        <label className="mt-8 block">
          <span className="text-sm font-semibold text-slate-700">
            Organisation name
          </span>
          <input
            className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-200"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Creating...' : 'Create Organisation'}
        </button>
      </form>
    </main>
  );
}
