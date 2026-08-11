import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Filter,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

import { listPaymentAdvices } from '../api/documents';
import AppShell from '../components/layout/AppShell';

const statusOptions = [
  ['all', 'All statuses'],
  ['reconciled', 'Reconciled'],
  ['partial_reconciled', 'Partial reconciled'],
  ['unreconciled', 'Unreconciled'],
];

const sortOptions = [
  ['latest_email', 'Latest email'],
  ['oldest_email', 'Oldest email'],
  ['newest_payment', 'Newest payment date'],
  ['oldest_payment', 'Oldest payment date'],
  ['amount_high_low', 'Amount high to low'],
  ['amount_low_high', 'Amount low to high'],
];

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString();
}

function asNumber(value) {
  return Number(value) || 0;
}

function mapAdvice(row) {
  const payload = row.parsed_payload ?? {};
  const entries = Array.isArray(payload.payment_entries)
    ? payload.payment_entries
    : [];
  return {
    id: row.id,
    emailDate: row.email_date,
    emailFrom: row.email_from || '-',
    emailSubject: row.email_subject || '-',
    referenceNumber:
      row.reference_number ||
      payload.bank_reference_no ||
      payload.payment_invoice_no ||
      '-',
    clientName: row.client_name || payload.client_name || '-',
    invoiceNumber:
      row.invoice_number ||
      entries[0]?.invoice_number ||
      payload.payment_invoice_no ||
      '-',
    receivedAmount: asNumber(row.received_amount),
    totalAmount: asNumber(row.total_amount),
    paymentDate: row.payment_date,
    status: row.status,
    body:
      payload.email_body ||
      payload.extra_details?.notes ||
      'Payment advice parsed from mailbox.',
    entries,
    payload,
  };
}

function StatusBadge({ status }) {
  const labels = {
    reconciled: 'Reconciled',
    partial_reconciled: 'Partial reconciled',
    unreconciled: 'Unreconciled',
  };
  const styles = {
    reconciled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    partial_reconciled: 'border-amber-200 bg-amber-50 text-amber-700',
    unreconciled: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${
        styles[status] ?? styles.unreconciled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function PaymentAdvicePage() {
  const pageSize = 12;
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('latest_email');
  const [showFilters, setShowFilters] = useState(false);
  const [activeMail, setActiveMail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAdvice() {
    setIsLoading(true);
    setError('');
    try {
      const response = await listPaymentAdvices();
      setRows((response.results ?? []).map(mapAdvice));
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Payment advice could not be loaded. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdvice();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesStatus = status === 'all' || row.status === status;
        const matchesSearch =
          !normalizedQuery ||
          row.emailFrom.toLowerCase().includes(normalizedQuery) ||
          row.emailSubject.toLowerCase().includes(normalizedQuery) ||
          row.referenceNumber.toLowerCase().includes(normalizedQuery) ||
          row.clientName.toLowerCase().includes(normalizedQuery) ||
          row.invoiceNumber.toLowerCase().includes(normalizedQuery);

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        const emailLeft = new Date(left.emailDate || 0);
        const emailRight = new Date(right.emailDate || 0);
        const paymentLeft = new Date(left.paymentDate || 0);
        const paymentRight = new Date(right.paymentDate || 0);
        const sorters = {
          latest_email: emailRight - emailLeft,
          oldest_email: emailLeft - emailRight,
          newest_payment: paymentRight - paymentLeft,
          oldest_payment: paymentLeft - paymentRight,
          amount_high_low: right.totalAmount - left.totalAmount,
          amount_low_high: left.totalAmount - right.totalAmount,
        };

        return sorters[sortBy] ?? sorters.latest_email;
      });
  }, [query, rows, sortBy, status]);

  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredRows.length);
  const activeFilterCount = [status !== 'all'].filter(Boolean).length;
  const totalAmount = rows.reduce((total, row) => total + row.totalAmount, 0);
  const receivedAmount = rows.reduce(
    (total, row) => total + row.receivedAmount,
    0,
  );
  const unreconciledAmount = rows
    .filter((row) => row.status === 'unreconciled')
    .reduce((total, row) => total + row.totalAmount, 0);

  const kpis = [
    {
      label: 'Total Advice Value',
      value: currency(totalAmount),
      count: `${rows.length} mails`,
      Icon: Mail,
      className: 'from-indigo-700 via-blue-700 to-cyan-600',
      chip: 'bg-cyan-300/20 text-cyan-100',
    },
    {
      label: 'Received Amount',
      value: currency(receivedAmount),
      count: 'confirmed by email',
      Icon: CheckCircle2,
      className: 'from-emerald-700 via-teal-600 to-lime-500',
      chip: 'bg-emerald-100/20 text-emerald-50',
    },
    {
      label: 'Unreconciled Advice',
      value: currency(unreconciledAmount),
      count: `${rows.filter((row) => row.status === 'unreconciled').length} mails`,
      Icon: TrendingUp,
      className: 'from-rose-600 via-orange-500 to-amber-400',
      chip: 'bg-pink-100/20 text-pink-50',
    },
  ];

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setSortBy('latest_email');
    setCurrentPage(1);
  }

  return (
    <AppShell
      eyebrow="Payment Advice"
      title="Payment Advice Register"
      subtitle="Remittance emails ready for invoice and payment matching"
    >
      <section className="px-5 py-5">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_0.95fr]">
          {kpis.map((kpi) => (
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${kpi.className}`}
              key={kpi.label}
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25" />
              <div className="absolute -right-8 -top-10 h-32 w-32 rotate-12 rounded-[2.25rem] border border-white/15 bg-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                    {kpi.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {kpi.value}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${kpi.chip}`}
                  >
                    {kpi.count}
                  </span>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <kpi.Icon size={21} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-visible rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="sticky top-[5rem] z-20 rounded-t-2xl border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_50%,#f7fff7_100%)] px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-cyan-200 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Parsed Payment Advice Ledger
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {filteredRows.length} of {rows.length} records
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <label className="relative min-w-0 lg:w-[26rem]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Search mail, reference, client or invoice"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {sortOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                >
                  <Filter size={16} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="rounded-md bg-cyan-300 px-2 py-0.5 text-xs text-slate-950">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            {showFilters && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    Filter payment advice
                  </p>
                  <button
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    type="button"
                    onClick={() => setShowFilters(false)}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            <AdviceHeader />
          </div>

          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left text-sm">
              <AdviceColGroup />
              <thead className="sr-only">
                <AdviceHeaderRow />
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading && (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={11}
                    >
                      Loading payment advice...
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  paginatedRows.map((row, index) => (
                    <tr
                      className={`align-top transition ${
                        row.status === 'reconciled'
                          ? 'bg-emerald-50/55 hover:bg-emerald-100/60'
                          : row.status === 'partial_reconciled'
                            ? 'bg-amber-50/45 hover:bg-amber-100/55'
                            : index % 2 === 1
                              ? 'bg-rose-50/40 hover:bg-rose-100/50'
                              : 'bg-cyan-50/55 hover:bg-cyan-100/60'
                      }`}
                      key={row.id}
                    >
                      <td className="px-2 py-3 text-slate-600">
                        {formatDate(row.emailDate)}
                      </td>
                      <td className="break-words px-2 py-3 text-slate-700">
                        {row.emailFrom}
                      </td>
                      <td className="break-words px-2 py-3 font-semibold text-slate-950">
                        {row.emailSubject}
                      </td>
                      <td className="break-words px-2 py-3 text-slate-700">
                        {row.referenceNumber}
                      </td>
                      <td className="break-words px-2 py-3 text-slate-700">
                        {row.clientName}
                      </td>
                      <td className="break-words px-2 py-3 font-semibold text-slate-950">
                        {row.invoiceNumber}
                      </td>
                      <td className="px-2 py-3 font-semibold text-emerald-700">
                        {currency(row.receivedAmount)}
                      </td>
                      <td className="px-2 py-3 font-semibold text-slate-950">
                        {currency(row.totalAmount)}
                      </td>
                      <td className="px-2 py-3 text-slate-600">
                        {formatDate(row.paymentDate)}
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-2 py-3">
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800"
                          type="button"
                          onClick={() => setActiveMail(row)}
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {pageStart}-{pageEnd} of {filteredRows.length} payment
                advice mails
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={currentPage === 1}
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                >
                  Previous
                </button>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    className={`grid h-8 w-8 place-items-center rounded-md border transition ${
                      currentPage === page
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={currentPage === totalPages}
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {!isLoading && filteredRows.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-950">
                No payment advice mails found.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sync the mailbox or clear search and status filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {activeMail && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close payment advice mail"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px]"
            type="button"
            onClick={() => setActiveMail(null)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_32%),linear-gradient(135deg,#ffffff,#f1f7ff_52%,#ecfdf5)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Payment advice mail
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {activeMail.referenceNumber}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {activeMail.emailFrom} · {formatDate(activeMail.emailDate)}
                  </p>
                </div>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  type="button"
                  onClick={() => setActiveMail(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ['Received', activeMail.receivedAmount, 'text-emerald-700'],
                  ['Invoice total', activeMail.totalAmount, 'text-slate-950'],
                  [
                    'Variance',
                    activeMail.totalAmount - activeMail.receivedAmount,
                    activeMail.totalAmount - activeMail.receivedAmount > 0
                      ? 'text-orange-700'
                      : 'text-emerald-700',
                  ],
                ].map(([label, value, tone]) => (
                  <div
                    className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
                    key={label}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className={`mt-1 text-lg font-semibold ${tone}`}>
                      {currency(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Subject
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {activeMail.emailSubject}
                </p>
              </section>
              <section className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Client', activeMail.clientName],
                  ['Invoice', activeMail.invoiceNumber],
                  ['Reference', activeMail.referenceNumber],
                  ['Payment date', formatDate(activeMail.paymentDate)],
                ].map(([label, value]) => (
                  <div
                    className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                    key={label}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words font-semibold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </section>
              <section className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Payment entries
                </p>
                <div className="mt-3 space-y-2">
                  {activeMail.entries.length === 0 && (
                    <p className="text-sm font-medium text-slate-500">
                      No invoice entries were returned by the parser.
                    </p>
                  )}
                  {activeMail.entries.map((entry, index) => (
                    <div
                      className="grid gap-2 rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-emerald-100 sm:grid-cols-[1fr_auto]"
                      key={`${entry.invoice_number}-${index}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {entry.invoice_number || 'Invoice reference missing'}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {entry.reference || 'No extra reference'}
                        </p>
                      </div>
                      <p className="font-semibold text-emerald-700">
                        {currency(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Mail body preview
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-600">
                  {activeMail.body}
                </p>
              </section>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function AdviceColGroup() {
  return (
    <colgroup>
      <col className="w-[7%]" />
      <col className="w-[12%]" />
      <col className="w-[14%]" />
      <col className="w-[10%]" />
      <col className="w-[11%]" />
      <col className="w-[8%]" />
      <col className="w-[9%]" />
      <col className="w-[9%]" />
      <col className="w-[8%]" />
      <col className="w-[7%]" />
      <col className="w-[5%]" />
    </colgroup>
  );
}

function AdviceHeaderRow() {
  return (
    <tr>
      <th className="px-2 py-3">Email Date</th>
      <th className="px-2 py-3">Email From</th>
      <th className="px-2 py-3">Email Subject</th>
      <th className="px-2 py-3">Reference #</th>
      <th className="px-2 py-3">Client Name</th>
      <th className="px-2 py-3">Invoice #</th>
      <th className="px-2 py-3">Received Amount</th>
      <th className="px-2 py-3">Total Amount</th>
      <th className="px-2 py-3">Payment Date</th>
      <th className="px-2 py-3">Status</th>
      <th className="px-2 py-3">View Mail</th>
    </tr>
  );
}

function AdviceHeader() {
  return (
    <div className="-mx-4 mt-4 border-t border-slate-200 bg-slate-50">
      <table className="w-full table-fixed text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
        <AdviceColGroup />
        <thead>
          <AdviceHeaderRow />
        </thead>
      </table>
    </div>
  );
}
