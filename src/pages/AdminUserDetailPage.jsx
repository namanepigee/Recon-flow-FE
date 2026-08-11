import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as usersApi from '../api/users';
import AppShell from '../components/layout/AppShell';
import Badge from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';

export default function AdminUserDetailPage() {
  const { membershipId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    usersApi.getUser(membershipId).then(setData);
  }, [membershipId]);

  if (!data) {
    return (
      <AppShell>
        <section className="p-8">
          <LoadingState />
        </section>
      </AppShell>
    );
  }

  const { membership, permissions, activity } = data;

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">{membership.user.email}</h1>
          <p className="mt-2 text-slate-600">
            {membership.user.first_name} {membership.user.last_name}
          </p>
          <div className="mt-4 flex gap-2">
            <Badge tone={membership.role}>{membership.role_display}</Badge>
            <Badge tone={membership.status}>{membership.status_display}</Badge>
          </div>
          <Link
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white"
            to={`/admin/users/${membership.id}/permissions`}
          >
            Manage permissions
          </Link>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Effective permissions</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <Badge
                  key={permission.code}
                  tone={permission.effective ? 'active' : 'deactivated'}
                >
                  {permission.code}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Recent audit activity</h2>
            {activity.map((item) => (
              <p className="mt-2 text-sm text-slate-600" key={item.id}>
                {new Date(item.created_at).toLocaleString()} - {item.action}
              </p>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
