import { useEffect, useState } from 'react';

import * as organisationApi from '../api/organisation';
import * as profileApi from '../api/profile';
import AppShell from '../components/layout/AppShell';
import Badge from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';
import { useOrganisation } from '../hooks/useOrganisation';
import { usePermission } from '../hooks/usePermission';
import { summarizePermissionGroups } from '../utils/permissionGroups';

export default function ProfilePage() {
  const { refreshOrganisations } = useOrganisation();
  const { hasPermission } = usePermission();
  const [profile, setProfile] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [organisationName, setOrganisationName] = useState('');
  const [activity, setActivity] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    avatar: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [message, setMessage] = useState('');

  async function loadProfile() {
    const [profileData, permissionData, activityData, organisationData] =
      await Promise.all([
        profileApi.getProfile(),
        profileApi.getProfilePermissions(),
        profileApi.getProfileActivity(),
        organisationApi.getCurrentOrganisation(),
      ]);
    setProfile(profileData);
    setOrganisation(organisationData.organisation);
    setOrganisationName(organisationData.organisation.name);
    setPermissions(permissionData.permissions ?? []);
    setActivity(activityData.results ?? []);
    setForm({
      first_name: profileData.user.first_name ?? '',
      last_name: profileData.user.last_name ?? '',
      avatar: profileData.user.avatar_url ?? '',
    });
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (!profile) {
    return (
      <AppShell>
        <section className="mx-auto max-w-7xl px-5 py-8">
          <LoadingState label="Loading profile..." />
        </section>
      </AppShell>
    );
  }

  async function saveProfile(event) {
    event.preventDefault();
    await profileApi.updateProfile(form);
    setMessage('Profile updated.');
    await loadProfile();
  }

  async function changePassword(event) {
    event.preventDefault();
    await profileApi.changePassword(passwordForm);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setMessage('Password changed.');
  }

  async function saveOrganisation(event) {
    event.preventDefault();
    const data = await organisationApi.updateCurrentOrganisation({
      name: organisationName,
    });
    setOrganisation(data.organisation);
    setMessage('Organisation details updated.');
    await refreshOrganisations();
  }

  const membership = profile.active_membership;
  const permissionGroups = summarizePermissionGroups(permissions);

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Profile</h1>
          {message && (
            <p className="mt-3 text-sm text-emerald-700">{message}</p>
          )}
          <form className="mt-6 space-y-4" onSubmit={saveProfile}>
            {['first_name', 'last_name', 'avatar'].map((field) => (
              <label className="block" key={field}>
                <span className="text-sm font-semibold capitalize text-slate-700">
                  {field.replace('_', ' ')}
                </span>
                <input
                  className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-slate-500"
                readOnly
                value={profile.user.email}
              />
            </label>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
              Save profile
            </button>
          </form>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Organisation details</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Badge tone={membership?.role}>{membership?.role_display}</Badge>
              <Badge tone={membership?.status}>
                {membership?.status_display}
              </Badge>
              <Badge tone={profile.user.is_active ? 'active' : 'deactivated'}>
                Account {profile.user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {hasPermission('organisation.update') ? (
              <form className="mt-5" onSubmit={saveOrganisation}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Organisation name
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={organisationName}
                    onChange={(event) =>
                      setOrganisationName(event.target.value)
                    }
                  />
                </label>
                <button className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700">
                  Save organisation
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Organisation: {membership?.organisation?.name}
              </p>
            )}
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-semibold text-slate-500">Slug</dt>
                <dd className="mt-1 text-slate-900">{organisation?.slug}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-semibold text-slate-500">Active users</dt>
                <dd className="mt-1 text-slate-900">
                  {organisation?.active_user_count}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-semibold text-slate-500">Memberships</dt>
                <dd className="mt-1 text-slate-900">
                  {organisation?.total_membership_count}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-semibold text-slate-500">Permissions</dt>
                <dd className="mt-1 text-slate-900">
                  {membership?.effective_permissions?.length ?? 0}
                </dd>
              </div>
            </dl>
          </div>
          <form
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            onSubmit={changePassword}
          >
            <h2 className="text-xl font-bold">Security</h2>
            {Object.keys(passwordForm).map((field) => (
              <input
                className="mt-4 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                key={field}
                placeholder={field.replaceAll('_', ' ')}
                type="password"
                value={passwordForm[field]}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            ))}
            <button className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
              Change password
            </button>
          </form>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Permissions</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {permissionGroups.map((permission) => (
                <Badge
                  key={permission.id}
                  tone={permission.effective ? 'active' : 'deactivated'}
                >
                  {permission.title}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Recent activity</h2>
            <div className="mt-4 space-y-2">
              {activity.map((item) => (
                <p className="text-sm text-slate-600" key={item.id}>
                  {new Date(item.created_at).toLocaleString()} - {item.action}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
