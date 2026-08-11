import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import ButtonSpinner from '../components/common/ButtonSpinner';
import FormAlert from '../components/common/FormAlert';
import Logo from '../components/common/Logo';
import { useAuth } from '../hooks/useAuth';
import {
  normalizeServerErrors,
  validateEmail,
  validatePassword,
} from '../utils/validation';

export default function LoginPage() {
  const { isAuthenticated, isInitializing, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = location.state?.from?.pathname || '/';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '', general: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(nextErrors);

    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setIsSubmitting(true);
    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate(from, { replace: true });
    } catch (error) {
      const serverErrors = normalizeServerErrors(error.data?.errors);
      setErrors({
        email: serverErrors.email,
        password: serverErrors.password,
        general: serverErrors.general || error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <div>
        <div className="mb-10">
          <Logo />
          <h2 className="mt-8 text-3xl font-bold tracking-normal text-slate-950">
            Return to reconciled books.
          </h2>
          <p className="mt-3 text-slate-600">
            Sign in to review matches, exceptions, and finance workflows from
            one trusted workspace.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormAlert>{errors.general}</FormAlert>
          <AuthInput
            ref={emailRef}
            autoComplete="email"
            error={errors.email}
            label="Email"
            name="email"
            placeholder="finance@example.com"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
          <AuthInput
            ref={passwordRef}
            autoComplete="current-password"
            error={errors.password}
            label="Password"
            name="password"
            placeholder="Enter your password"
            showPassword={showPassword}
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            onTogglePassword={() => setShowPassword((value) => !value)}
          />
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting && <ButtonSpinner />}
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          New to ReconFlow?{' '}
          <Link
            className="font-semibold text-teal-700 hover:text-teal-600"
            to="/signup"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
