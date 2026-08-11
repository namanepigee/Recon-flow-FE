export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
      {label}
    </div>
  );
}
