export const PERMISSION_GROUPS = [
  {
    id: 'view',
    title: 'View',
    description: 'Can view Organisation records and future financial data.',
    codes: [
      'organisation.view',
      'profile.view_own',
      'invoice.view',
      'bank_transaction.view',
      'reconciliation.view',
    ],
  },
  {
    id: 'edit',
    title: 'Edit',
    description: 'Can create, import and update operational finance records.',
    codes: [
      'profile.update_own',
      'profile.change_password',
      'invoice.create',
      'invoice.update',
      'invoice.import',
      'bank_transaction.create',
      'bank_transaction.update',
      'bank_transaction.import',
      'reconciliation.run',
      'reconciliation.review',
      'reconciliation.approve',
      'reconciliation.reject',
    ],
  },
  {
    id: 'users',
    title: 'Manage Users',
    description: 'Can create users, update roles and change membership status.',
    codes: [
      'organisation.users.view',
      'organisation.users.create',
      'organisation.users.update',
      'organisation.users.activate',
      'organisation.users.deactivate',
      'organisation.roles.manage',
    ],
  },
  {
    id: 'controls',
    title: 'Controls',
    description:
      'Can manage Organisation settings, permissions and audit access.',
    codes: [
      'organisation.update',
      'organisation.permissions.manage',
      'organisation.audit.view',
      'invoice.delete',
      'bank_transaction.delete',
      'reconciliation.undo',
    ],
  },
];

export function summarizePermissionGroups(permissions = []) {
  const byCode = Object.fromEntries(
    permissions.map((permission) => [permission.code, permission]),
  );

  return PERMISSION_GROUPS.map((group) => {
    const groupPermissions = group.codes
      .map((code) => byCode[code])
      .filter(Boolean);
    const allowedCount = groupPermissions.filter(
      (permission) => permission.effective,
    ).length;

    return {
      ...group,
      allowedCount,
      totalCount: groupPermissions.length,
      effective:
        groupPermissions.length > 0 && allowedCount === groupPermissions.length,
      partial: allowedCount > 0 && allowedCount < groupPermissions.length,
      permissions: groupPermissions,
    };
  });
}
