import Logo from '../common/Logo';

const invoices = ['INV-1042', 'INV-1058', 'INV-1091'];
const payments = ['$12,450', '$8,200', '$4,780'];

export default function AuthBrandPanel() {
  return (
    <aside className="auth-visual relative overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(20,184,166,0.18),transparent_30%),radial-gradient(circle_at_78%_35%,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#e9f6f5_55%,#f7fbff_100%)] px-6 py-8 sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.055)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <Logo />
        <div className="my-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            Automated reconciliation
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-slate-950 lg:text-7xl">
            Match invoices to payments with quiet precision.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            ReconFlow gives finance teams a trusted control surface for imported
            statements, invoice matching, and exception review.
          </p>
        </div>
        <div className="relative rounded-3xl bg-white/80 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Live match simulation
            </p>
            <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              94% reconciled
            </p>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <div
                  className="flow-card rounded-2xl bg-slate-50 p-3 shadow-sm ring-1 ring-slate-200/80"
                  key={invoice}
                  style={{ animationDelay: `${index * 180}ms` }}
                >
                  <p className="text-xs text-slate-500">Invoice</p>
                  <p className="font-semibold text-slate-950">{invoice}</p>
                </div>
              ))}
            </div>
            <div className="relative h-48 w-20">
              <span className="match-line top-8" />
              <span className="match-line top-24" />
              <span className="match-line top-40 opacity-40" />
            </div>
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div
                  className="flow-card rounded-2xl bg-slate-50 p-3 shadow-sm ring-1 ring-slate-200/80"
                  key={payment}
                  style={{ animationDelay: `${index * 220 + 120}ms` }}
                >
                  <p className="text-xs text-slate-500">Bank payment</p>
                  <p className="font-semibold text-slate-950">{payment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
