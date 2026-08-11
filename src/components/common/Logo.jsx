export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
        <span className="text-lg font-black text-cyan-200">R</span>
      </div>
      {!compact && (
        <div>
          <p className="text-base font-bold tracking-normal text-slate-950">
            ReconFlow
          </p>
          <p className="text-xs text-slate-500">Ledger matching automation</p>
        </div>
      )}
    </div>
  );
}
