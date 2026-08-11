import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import * as permissionsApi from '../api/permissions';
import AppShell from '../components/layout/AppShell';
import LoadingState from '../components/common/LoadingState';
import { summarizePermissionGroups } from '../utils/permissionGroups';

export default function AdminPermissionsPage() {
  const { membershipId } = useParams();
  const [permissions, setPermissions] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const data = await permissionsApi.getMembershipPermissions(membershipId);
    setPermissions(data.permissions);
  }, [membershipId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!permissions)
    return (
      <AppShell>
        <section className="p-8">
          <LoadingState />
        </section>
      </AppShell>
    );

  async function save() {
    const overrides = permissions.map(({ code, override }) => ({
      code,
      effect: override ?? '',
    }));
    await permissionsApi.updateMembershipPermissions(membershipId, overrides);
    setMessage('Permissions updated.');
    await load();
  }

  function setGroupOverride(group, effect) {
    setPermissions((current) =>
      current.map((permission) =>
        group.codes.includes(permission.code)
          ? { ...permission, override: effect || null }
          : permission,
      ),
    );
  }

  const groups = summarizePermissionGroups(permissions);

  async function reset() {
    await permissionsApi.resetMembershipPermissions(membershipId);
    setMessage('Permissions reset to role defaults.');
    await load();
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Permission management</h1>
              {message && (
                <p className="mt-2 text-sm text-emerald-700">{message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-2xl bg-slate-100 px-4 py-2 font-semibold"
                onClick={reset}
              >
                Reset
              </button>
              <button
                className="rounded-2xl bg-slate-950 px-4 py-2 font-semibold text-white"
                onClick={save}
              >
                Save changes
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            {groups.map((group) => (
              <div
                className="grid gap-4 rounded-3xl bg-blue-50/60 p-5 ring-1 ring-blue-100 lg:grid-cols-[1fr_auto]"
                key={group.id}
              >
                <div>
                  <p className="text-lg font-bold text-slate-950">
                    {group.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {group.description}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-blue-700">
                    {group.allowedCount}/{group.totalCount} underlying controls
                    allowed
                  </p>
                </div>
                <select
                  className="h-fit rounded-2xl bg-white px-4 py-3 font-semibold ring-1 ring-blue-100"
                  value=""
                  onChange={(event) =>
                    setGroupOverride(group, event.target.value)
                  }
                >
                  <option value="">
                    {group.effective
                      ? 'Allowed'
                      : group.partial
                        ? 'Partially allowed'
                        : 'Not allowed'}
                  </option>
                  <option value="">Use role defaults</option>
                  <option value="allow">Allow this area</option>
                  <option value="deny">Deny this area</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
