import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
        <Link
          className="mt-6 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          to="/"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
