import Logo from '../common/Logo';

export default function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="mx-auto flex w-56 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2">
          <span className="h-2 flex-1 animate-pulse rounded-full bg-cyan-300" />
          <span className="h-2 flex-1 animate-pulse rounded-full bg-emerald-300 delay-150" />
          <span className="h-2 flex-1 animate-pulse rounded-full bg-cyan-300 delay-300" />
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Restoring secure workspace...
        </p>
      </div>
    </main>
  );
}
