import AuthBrandPanel from './AuthBrandPanel';

export default function AuthCard({ children }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef7f8_45%,#f8fbff_100%)] text-slate-950">
      <div className="grid min-h-screen w-full items-stretch lg:grid-cols-[1.18fr_0.82fr]">
        <AuthBrandPanel />
        <section className="auth-panel flex items-center bg-white/60 px-6 py-10 backdrop-blur-sm sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
