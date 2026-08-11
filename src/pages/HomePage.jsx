import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getHealth } from '../api/health';

const statusStyles = {
  checking: 'border-sky-200 bg-sky-50 text-sky-900',
  connected: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  unavailable: 'border-rose-200 bg-rose-50 text-rose-900',
};

function StatusCard({ label, value, state }) {
  return (
    <div className={`rounded-md border p-4 ${statusStyles[state]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    setError('');

    try {
      const data = await getHealth();
      setHealth(data);
      setStatus(data?.database === 'connected' ? 'connected' : 'unavailable');
    } catch (requestError) {
      setHealth(null);
      setStatus('unavailable');
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const backendLabel =
    status === 'checking'
      ? 'Checking'
      : health?.status === 'ok'
        ? 'Connected'
        : 'Unavailable';
  const databaseLabel =
    status === 'checking'
      ? 'Checking'
      : health?.database === 'connected'
        ? 'Connected'
        : 'Unavailable';

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Production foundation
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
            Fullstack App
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-700">
            The React frontend is running and checking the Django REST API.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <StatusCard label="Backend" value={backendLabel} state={status} />
          <StatusCard label="Database" value={databaseLabel} state={status} />
        </div>

        {status === 'checking' && (
          <p className="mt-6 text-sm text-zinc-600">
            Checking the backend connection...
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-rose-200 bg-white p-4 text-rose-800">
            <p className="font-medium">Backend or database unavailable</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        <button
          className="mt-8 w-fit rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={checkHealth}
          disabled={status === 'checking'}
        >
          Retry connection
        </button>
        <Link
          className="mt-4 w-fit rounded-md border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white"
          to="/signup"
        >
          Open authentication
        </Link>
      </section>
    </main>
  );
}
