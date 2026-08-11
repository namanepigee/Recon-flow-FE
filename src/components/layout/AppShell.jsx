import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Gauge,
  Home,
  FileText,
  GitCompareArrows,
  LockKeyhole,
  Loader2,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Landmark,
  Settings,
  User,
  Users,
} from 'lucide-react';

import Logo from '../common/Logo';
import NotificationBell from '../notifications/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';

function processingLabel(status) {
  if (!status?.type) return '';
  const label =
    {
      invoice: 'invoice',
      bank_statement: 'bank statement',
    }[status.type] ?? 'document';
  const count = status.count ? `${status.count} ` : '';
  const plural = status.count === 1 ? 'file' : 'files';
  return `Processing ${count}${label} ${plural}`;
}

export default function AppShell({
  children,
  title,
  subtitle,
  eyebrow,
  processingStatus,
}) {
  const { logout, user } = useAuth();
  const { hasPermission } = usePermission();
  const location = useLocation();
  const [isSidebarAccountOpen, setIsSidebarAccountOpen] = useState(false);
  const [isTopAccountOpen, setIsTopAccountOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return (
      window.localStorage.getItem('reconflow_sidebar_collapsed') === 'true'
    );
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isHome = location.pathname === '/';
  const primaryNav = [
    ['Home', '/', Home, true, 'Upload and reconciliation intake'],
    ['Dashboard', '/dashboard', Gauge, true, 'Analytics and close insights'],
    ['Recon', '/recon', GitCompareArrows, true, 'Invoice and payment matching'],
    ['Invoices', '/invoice', FileText, true, 'Parsed invoice register'],
    ['Payments', '/payments', Landmark, true, 'Parsed bank transactions'],
    [
      'Payment Advice',
      '/payment-advice',
      Mail,
      true,
      'Remittance email register',
    ],
  ].filter((item) => item[3]);
  const adminNav = [
    ['Profile', '/profile', User, true, 'Account and workspace details'],
    [
      'User Maintenance',
      '/admin/users',
      Users,
      hasPermission('organisation.users.view'),
      'Members, invites, status and audit trail',
    ],
    [
      'Permissions',
      '/admin/permissions',
      LockKeyhole,
      hasPermission('organisation.permissions.manage'),
      'View, edit, users and controls access',
    ],
  ].filter((item) => item[3]);

  useEffect(() => {
    window.localStorage.setItem(
      'reconflow_sidebar_collapsed',
      String(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  function closeMenus() {
    setIsSidebarAccountOpen(false);
    setIsTopAccountOpen(false);
    setIsSidebarOpen(false);
  }

  function navClass(isActive, emphasis = 'main') {
    if (emphasis === 'main') {
      return `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
        isActive
          ? 'bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]'
          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
      }`;
    }

    return `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-slate-950 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
    }`;
  }

  function collapsedTooltip(label, description) {
    return (
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold text-white opacity-0 shadow-xl shadow-slate-950/20 ring-1 ring-white/10 transition group-hover:translate-x-1 group-hover:opacity-100 lg:group-hover:block">
        <span className="block text-sm">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] font-medium text-slate-300">
            {description}
          </span>
        )}
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f9fe] text-slate-950">
      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px]"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 max-w-[86vw] border-r border-slate-200 bg-white px-4 py-5 shadow-[18px_0_70px_rgba(37,99,235,0.12)] transition-[width,transform] duration-300 lg:translate-x-0 lg:shadow-none ${
          isSidebarCollapsed ? 'lg:w-[4.25rem] lg:px-2' : 'lg:w-72'
        } w-72 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex px-2 ${
              isSidebarCollapsed
                ? 'lg:flex-col lg:items-center lg:gap-2 lg:px-0'
                : 'items-center justify-between'
            }`}
          >
            <div
              className={`overflow-hidden transition-opacity ${
                isSidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100'
              }`}
            >
              <Logo />
            </div>
            {isSidebarCollapsed && (
              <div className="hidden h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-bold text-cyan-200 shadow-sm lg:grid">
                R
              </div>
            )}
            <button
              aria-label="Close navigation"
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
            >
              <PanelLeftClose size={19} />
            </button>
            <button
              aria-label={
                isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
              className={`hidden place-items-center rounded-xl text-slate-500 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 ${
                isSidebarCollapsed ? 'lg:hidden' : 'lg:grid h-10 w-10'
              }`}
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            {isSidebarCollapsed && (
              <button
                aria-label="Expand sidebar"
                className="group relative hidden h-8 w-8 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200 lg:grid"
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
              >
                <PanelLeftOpen size={16} />
                {collapsedTooltip('Expand sidebar', 'Show labels and account')}
              </button>
            )}
          </div>
          <div
            className={`mt-5 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition ${
              isSidebarCollapsed ? 'lg:hidden' : ''
            }`}
            title="Workspace ready for document intake"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Workspace
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Ready for document intake
            </p>
          </div>
          <nav className={isSidebarCollapsed ? 'mt-7' : 'mt-8'}>
            <p
              className={`px-3 text-xs font-bold uppercase tracking-wide text-slate-400 ${
                isSidebarCollapsed ? 'lg:hidden' : ''
              }`}
            >
              Main
            </p>
            <div className="mt-3 space-y-1">
              {primaryNav.map(([label, to, Icon, , description]) => (
                <NavLink
                  className={({ isActive }) =>
                    `${navClass(isActive)} group relative ${
                      isSidebarCollapsed
                        ? 'lg:h-9 lg:justify-center lg:rounded-xl lg:px-0 lg:py-0'
                        : ''
                    }`
                  }
                  key={label}
                  to={to}
                  title={label}
                  onClick={closeMenus}
                >
                  <span
                    className={`grid place-items-center rounded-xl bg-white/10 ring-1 ring-current/10 ${
                      isSidebarCollapsed ? 'h-7 w-7' : 'h-9 w-9'
                    }`}
                  >
                    <Icon size={isSidebarCollapsed ? 15 : 18} />
                  </span>
                  <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>
                    <span className="block">{label}</span>
                    <span className="block text-xs font-medium opacity-65">
                      {description}
                    </span>
                  </span>
                  {isSidebarCollapsed && collapsedTooltip(label, description)}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="mt-auto space-y-4">
            <div className="relative">
              <button
                className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-blue-700 ${
                  isSidebarCollapsed
                    ? 'lg:h-9 lg:justify-center lg:rounded-xl lg:px-0 lg:py-0'
                    : ''
                }`}
                type="button"
                onClick={() => setIsSidebarAccountOpen((value) => !value)}
              >
                <span
                  className={`relative grid place-items-center rounded-xl bg-blue-50 text-blue-700 ${
                    isSidebarCollapsed ? 'h-7 w-7' : 'h-9 w-9'
                  }`}
                >
                  <Settings size={isSidebarCollapsed ? 15 : 18} />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                </span>
                <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>
                  Account
                </span>
                <ChevronDown
                  className={`ml-auto transition ${
                    isSidebarAccountOpen ? 'rotate-180' : ''
                  } ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
                  size={16}
                />
                {isSidebarCollapsed &&
                  collapsedTooltip('Account', 'Profile, users and permissions')}
              </button>
              {isSidebarAccountOpen && (
                <div
                  className={`absolute bottom-full mb-3 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-blue-100 ${
                    isSidebarCollapsed ? 'left-full ml-3 w-64' : 'left-0 w-full'
                  }`}
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Account
                    </p>
                  </div>
                  <div className="p-2">
                    {adminNav.map(([label, to, Icon]) => (
                      <NavLink
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        key={label}
                        to={to}
                        onClick={closeMenus}
                      >
                        <Icon size={17} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div
              className={`rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 ${
                isSidebarCollapsed ? 'lg:bg-transparent lg:p-0 lg:ring-0' : ''
              }`}
            >
              <div
                className={`flex items-center gap-3 ${
                  isSidebarCollapsed ? 'lg:justify-center' : ''
                }`}
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                  {user?.email?.slice(0, 1).toUpperCase()}
                </div>
                <div
                  className={`min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
                >
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user?.email}
                  </p>
                  <p className="text-xs text-slate-500">Signed in</p>
                </div>
              </div>
              <button
                className={`mt-4 w-full rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 ${
                  isSidebarCollapsed ? 'lg:hidden' : ''
                }`}
                type="button"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`transition-[padding] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[4.25rem]' : 'lg:pl-72'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white px-4 py-3 shadow-sm sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 lg:hidden"
                type="button"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="lg:hidden">
                <Logo compact />
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  {eyebrow ?? 'ReconFlow'}
                </p>
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-950">
                  {title ?? 'Financial reconciliation workspace'}
                </h1>
                {subtitle && (
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
              {isHome && (
                <button
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('document-upload-workspace')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  <Gauge size={17} />
                  Upload files
                </button>
              )}
            </div>
            {processingStatus?.type && (
              <div
                aria-live="polite"
                className="hidden items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 shadow-sm lg:flex"
                role="status"
              >
                <Loader2
                  className="animate-spin text-blue-600"
                  size={15}
                  strokeWidth={2.4}
                />
                <span>{processingLabel(processingStatus)}</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
            </div>
            <div className="relative">
              <button
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50"
                type="button"
                onClick={() => setIsTopAccountOpen((value) => !value)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                  {user?.email?.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-44 truncate sm:block">
                  {user?.email}
                </span>
                <ChevronDown size={16} />
              </button>
              {isTopAccountOpen && (
                <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-blue-100">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {user?.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Account and workspace
                    </p>
                  </div>
                  <div className="px-2 py-2">
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Account
                    </p>
                    {adminNav.map(([label, to, Icon]) => (
                      <NavLink
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        key={label}
                        to={to}
                        onClick={closeMenus}
                      >
                        <Icon size={17} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                  <button
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    type="button"
                    onClick={logout}
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.10),transparent_30%)]" />
          <div className="relative">{children}</div>
        </div>
      </div>
    </main>
  );
}
