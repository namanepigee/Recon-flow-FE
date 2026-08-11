import { useCallback, useEffect, useState } from 'react';

import * as auditApi from '../api/audit';
import AppShell from '../components/layout/AppShell';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';

export default function AdminAuditPage() {
  const [rows, setRows] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    category: '',
  });

  const load = useCallback(async () => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value),
    );
    const data = await auditApi.listAudit(params);
    setRows(data.results ?? []);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Audit Trail</h1>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                load();
              }}
            >
              {['search', 'action', 'category'].map((field) => (
                <input
                  className="rounded-2xl bg-slate-50 px-4 py-2 ring-1 ring-slate-200"
                  key={field}
                  placeholder={field}
                  value={filters[field]}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              ))}
              <button className="rounded-2xl bg-slate-950 px-4 py-2 font-semibold text-white">
                Filter
              </button>
            </form>
          </div>
          {rows === null ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No audit entries"
              description="Activity will appear here."
            />
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-3">Date and time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Target</th>
                    <th>Description</th>
                    <th>IP address</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="border-t border-slate-100" key={row.id}>
                      <td className="py-3">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td>{row.actor_email || 'System'}</td>
                      <td>{row.action}</td>
                      <td>{row.category}</td>
                      <td>{row.target_display}</td>
                      <td>{row.description}</td>
                      <td>{row.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
