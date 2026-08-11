export default function FormAlert({ children }) {
  if (!children) return null;

  return (
    <div
      className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
      role="alert"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
