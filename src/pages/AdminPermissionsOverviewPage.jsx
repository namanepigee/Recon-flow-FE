import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as usersApi from '../api/users';
import AppShell from '../components/layout/AppShell';
import Badge from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';
import { summarizePermissionGroups } from '../utils/permissionGroups';

export default function AdminPermissionsOverviewPage() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    usersApi.listUsers().then((data) => setUsers(data.results ?? []));
  }, []);

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-slate-950">Permissions</h1>
            <p className="mt-2 text-slate-500">
              Review effective access for each Organisation member and open a
              focused permission editor when overrides are needed.
            </p>
          </div>
          {!users ? (
            <div className="mt-6">
              <LoadingState />
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {users.map((membership) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-blue-50/50 p-5 ring-1 ring-blue-100"
                  key={membership.id}
                >
                  <div>
                    <p className="font-bold text-slate-950">
                      {membership.user.first_name || membership.user.email}
                    </p>
                    <p className="text-sm text-slate-500">
                      {membership.user.email}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={membership.role}>
                        {membership.role_display}
                      </Badge>
                      <Badge tone={membership.status}>
                        {membership.status_display}
                      </Badge>
                      <Badge tone="active">
                        {
                          summarizePermissionGroups(
                            membership.effective_permissions.map((code) => ({
                              code,
                              effective: true,
                            })),
                          ).filter((group) => group.effective).length
                        }{' '}
                        access areas enabled
                      </Badge>
                    </div>
                  </div>
                  <Link
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700"
                    to={`/admin/users/${membership.id}/permissions`}
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
