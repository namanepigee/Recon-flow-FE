import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as auditApi from '../api/audit';
import * as usersApi from '../api/users';
import AppShell from '../components/layout/AppShell';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'financial_analyst',
    status: 'pending',
  });
  const [setupLink, setSetupLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [auditRows, setAuditRows] = useState([]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const data = await usersApi.listUsers(search ? { search } : {});
    setUsers(data.results ?? []);
    setIsLoading(false);
  }, [search]);

  useEffect(() => {
    loadUsers();
    auditApi.listAudit({ category: 'membership' }).then((data) => {
      setAuditRows((data.results ?? []).slice(0, 5));
    });
  }, [loadUsers]);

  async function createUser(event) {
    event.preventDefault();
    const data = await usersApi.createUser(form);
    setSetupLink(data.setup_link);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      role: 'financial_analyst',
      status: 'pending',
    });
    await loadUsers();
    setShowCreateForm(false);
  }

  async function action(fn, id) {
    await fn(id);
    await loadUsers();
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-slate-950">
                  Organisation Users
                </h1>
                <p className="mt-1 text-slate-500">
                  Manage access, roles and membership status.
                </p>
              </div>
              <button
                className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700"
                type="button"
                onClick={() => setShowCreateForm((value) => !value)}
              >
                {showCreateForm ? 'Close form' : 'Add user'}
              </button>
            </div>
            {showCreateForm && (
              <form
                className="mt-6 grid gap-3 rounded-3xl bg-blue-50/60 p-4 ring-1 ring-blue-100 md:grid-cols-5"
                onSubmit={createUser}
              >
                {['first_name', 'last_name', 'email'].map((field) => (
                  <input
                    className="rounded-2xl bg-white px-4 py-3 ring-1 ring-blue-100"
                    key={field}
                    placeholder={field.replace('_', ' ')}
                    value={form[field]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                  />
                ))}
                <select
                  className="rounded-2xl bg-white px-4 py-3 ring-1 ring-blue-100"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="financial_analyst">Financial Analyst</option>
                </select>
                <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
                  Create
                </button>
              </form>
            )}
            {setupLink && (
              <p className="mt-4 break-all rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                Setup link: {setupLink}
              </p>
            )}
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                loadUsers();
              }}
            >
              <input
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-blue-100"
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
            {isLoading ? (
              <LoadingState />
            ) : users.length === 0 ? (
              <EmptyState
                title="No users"
                description="Create the first member."
              />
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3">Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Permissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((membership) => (
                      <tr
                        className="border-t border-slate-100"
                        key={membership.id}
                      >
                        <td className="py-3">
                          {membership.user.first_name}{' '}
                          {membership.user.last_name}
                        </td>
                        <td>{membership.user.email}</td>
                        <td>
                          <Badge tone={membership.role}>
                            {membership.role_display}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={membership.status}>
                            {membership.status_display}
                          </Badge>
                        </td>
                        <td>{membership.effective_permissions.length}</td>
                        <td className="flex flex-wrap gap-2 py-3">
                          <Link
                            className="font-semibold text-teal-700"
                            to={`/admin/users/${membership.id}`}
                          >
                            View
                          </Link>
                          <button
                            onClick={() =>
                              action(usersApi.activateUser, membership.id)
                            }
                          >
                            Activate
                          </button>
                          <button
                            onClick={() =>
                              action(usersApi.suspendUser, membership.id)
                            }
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() =>
                              action(usersApi.deactivateUser, membership.id)
                            }
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
            <h2 className="text-2xl font-bold">Audit Trail</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent membership and user-management activity.
            </p>
            <div className="mt-5 grid gap-3">
              {auditRows.map((row) => (
                <div
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                  key={row.id}
                >
                  <p className="font-semibold text-slate-800">{row.action}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(row.created_at).toLocaleString()} -{' '}
                    {row.description}
                  </p>
                </div>
              ))}
            </div>
            <Link
              className="mt-5 inline-flex font-semibold text-blue-700"
              to="/admin/audit"
            >
              View full audit trail
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
