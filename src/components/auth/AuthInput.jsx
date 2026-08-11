import { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const AuthInput = forwardRef(function AuthInput(
  { error, label, type = 'text', showPassword, onTogglePassword, ...props },
  ref,
) {
  const isPassword = type === 'password';
  const actualType = isPassword && showPassword ? 'text' : type;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <input
          ref={ref}
          className={`w-full rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-sm outline-none ring-1 transition placeholder:text-slate-400 focus:ring-4 focus:ring-cyan-200/70 ${
            error ? 'ring-rose-300' : 'ring-slate-200'
          } ${isPassword ? 'pr-12' : ''}`}
          type={actualType}
          {...props}
        />
        {isPassword && (
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            type="button"
            onClick={onTogglePassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
      <span
        className="mt-2 block min-h-5 text-sm text-rose-600"
        aria-live="polite"
      >
        {error}
      </span>
    </label>
  );
});

export default AuthInput;
