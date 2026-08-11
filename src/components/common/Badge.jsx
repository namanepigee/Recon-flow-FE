const tones = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-orange-50 text-orange-700 ring-orange-200',
  deactivated: 'bg-slate-100 text-slate-600 ring-slate-200',
  admin: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  financial_analyst: 'bg-blue-50 text-blue-700 ring-blue-200',
};

export default function Badge({ children, tone = 'active' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        tones[tone] ?? tones.active
      }`}
    >
      {children}
    </span>
  );
}
