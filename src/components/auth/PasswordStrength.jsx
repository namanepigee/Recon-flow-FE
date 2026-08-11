import { passwordChecks } from '../../utils/validation';

export default function PasswordStrength({ password }) {
  const checks = passwordChecks(password);
  const score = checks.filter((check) => check.valid).length;

  return (
    <div className="rounded-2xl bg-slate-50 p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-1">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`h-1.5 flex-1 rounded-full transition ${
              check.valid ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-600">
        Password strength: {score}/5
      </p>
      <ul className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.label}
            className={check.valid ? 'text-emerald-700' : ''}
          >
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
