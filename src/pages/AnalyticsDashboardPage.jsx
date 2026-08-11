import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CheckCircle2,
  FileText,
  Filter,
  Mail,
  ReceiptText,
  Search,
  Sparkles,
  Split,
  X,
} from 'lucide-react';

import * as documentsApi from '../api/documents';
import { ApiError } from '../api/client';
import AppShell from '../components/layout/AppShell';

const statusOptions = [
  ['all', 'All statuses'],
  ['reconciled', 'Reconciled'],
  ['partial_reconciled', 'Partial reconciled'],
  ['unreconciled', 'Unreconciled'],
];

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value) || 0);
}

function compact(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function percent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(value) {
  const date = toDate(value);
  if (!date) return 'Unmapped';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function rowAmount(row, fields) {
  const value = fields.reduce(
    (selected, field) => selected ?? row[field],
    null,
  );
  return Number(value || 0);
}

function sumRows(rows, fields) {
  return rows.reduce((total, row) => total + rowAmount(row, fields), 0);
}

function statusRows(rows, status) {
  return rows.filter((row) => row.status === status);
}

function getAgeingBucket(value) {
  const date = toDate(value);
  if (!date) return 'No date';
  const days = Math.max(
    Math.floor((Date.now() - date.getTime()) / 86400000),
    0,
  );
  if (days <= 7) return '0-7 days';
  if (days <= 30) return '8-30 days';
  if (days <= 60) return '31-60 days';
  return '60+ days';
}

function filterRows(rows, config, filters) {
  const query = filters.query.trim().toLowerCase();
  const from = toDate(filters.dateFrom);
  const to = toDate(filters.dateTo);

  return rows.filter((row) => {
    const date = toDate(row[config.dateField]);
    const matchesStatus =
      filters.status === 'all' || row.status === filters.status;
    const matchesFrom = !from || (date && date >= from);
    const matchesTo = !to || (date && date <= to);
    const haystack = [
      row[config.clientField],
      row[config.numberField],
      row.bank_name,
      row.bank_reference_no,
      row.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesStatus && matchesFrom && matchesTo && matchesQuery;
  });
}

function buildMonthly(rows, config, limit = 8) {
  const grouped = rows.reduce((map, row) => {
    const key = monthKey(row[config.dateField]);
    if (key === 'Unmapped') return map;
    const current = map.get(key) ?? {
      label: key,
      total: 0,
      reconciled: 0,
      partial: 0,
      open: 0,
      count: 0,
    };
    const amount = rowAmount(row, config.amountFields);
    current.total += amount;
    current.count += 1;
    if (row.status === 'reconciled') current.reconciled += amount;
    if (row.status === 'partial_reconciled') current.partial += amount;
    if (row.status === 'unreconciled') current.open += amount;
    map.set(key, current);
    return map;
  }, new Map());

  return Array.from(grouped.values())
    .sort(
      (left, right) =>
        new Date(`01 ${left.label}`) - new Date(`01 ${right.label}`),
    )
    .slice(-limit);
}

function topClients(rows, config, limit = 6) {
  const grouped = rows.reduce((map, row) => {
    const label = row[config.clientField] || 'Unknown client';
    const current = map.get(label) ?? {
      label,
      total: 0,
      reconciled: 0,
      exceptions: 0,
      count: 0,
    };
    const amount = rowAmount(row, config.amountFields);
    current.total += amount;
    current.count += 1;
    if (row.status === 'reconciled') current.reconciled += amount;
    if (row.status !== 'reconciled') current.exceptions += amount;
    map.set(label, current);
    return map;
  }, new Map());

  return Array.from(grouped.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, limit);
}

function statusBreakdown(rows) {
  return [
    {
      label: 'Reconciled',
      value: statusRows(rows, 'reconciled').length,
      color: '#10b981',
    },
    {
      label: 'Partial',
      value: statusRows(rows, 'partial_reconciled').length,
      color: '#f59e0b',
    },
    {
      label: 'Unreconciled',
      value: statusRows(rows, 'unreconciled').length,
      color: '#f43f5e',
    },
  ];
}

function ageingBreakdown(rows, config) {
  const order = ['0-7 days', '8-30 days', '31-60 days', '60+ days', 'No date'];
  const grouped = rows.reduce((map, row) => {
    const bucket = getAgeingBucket(row[config.dateField]);
    const current = map.get(bucket) ?? { label: bucket, count: 0, value: 0 };
    current.count += 1;
    current.value += rowAmount(row, config.amountFields);
    map.set(bucket, current);
    return map;
  }, new Map());

  return order.map(
    (label) => grouped.get(label) ?? { label, count: 0, value: 0 },
  );
}

function riskQueue(rows, config) {
  return rows
    .filter((row) => row.status !== 'reconciled')
    .map((row) => ({
      id: row.id,
      label: row[config.numberField] || 'Unnumbered',
      client: row[config.clientField] || 'Unknown client',
      amount: rowAmount(row, config.amountFields),
      date: row[config.dateField],
      status: row.status,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 6);
}

function statusLabel(status) {
  return (
    {
      reconciled: 'Reconciled',
      partial_reconciled: 'Partial',
      unreconciled: 'Unreconciled',
    }[status] ?? status
  );
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : '-';
}

const configs = {
  invoice: {
    title: 'Invoice analytics',
    label: 'Invoices',
    unit: 'invoices',
    dateField: 'invoice_date',
    amountFields: ['total_amount'],
    matchedFields: ['matched_amount'],
    clientField: 'client_name',
    numberField: 'invoice_number',
  },
  payment: {
    title: 'Payment analytics',
    label: 'Payments',
    unit: 'payments',
    dateField: 'transaction_date',
    amountFields: ['credit', 'amount'],
    matchedFields: ['matched_amount'],
    clientField: 'client_name',
    numberField: 'bank_reference_no',
  },
};

export default function AnalyticsDashboardPage() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [advices, setAdvices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [view, setView] = useState('invoice');
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        invoiceResponse,
        paymentResponse,
        adviceResponse,
        documentResponse,
      ] = await Promise.all([
        documentsApi.listInvoices(),
        documentsApi.listBankTransactions(),
        documentsApi.listPaymentAdvices(),
        documentsApi.listDocuments(),
      ]);
      setInvoices(invoiceResponse.results ?? []);
      setPayments(paymentResponse.results ?? []);
      setAdvices(adviceResponse.results ?? []);
      setDocuments(documentResponse.results ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load dashboard analytics.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const config = configs[view];
  const rows = view === 'invoice' ? invoices : payments;

  const analytics = useMemo(() => {
    const filtered = filterRows(rows, config, filters);
    const totalValue = sumRows(filtered, config.amountFields);
    const matchedValue = sumRows(statusRows(filtered, 'reconciled'), [
      ...config.matchedFields,
      ...config.amountFields,
    ]);
    const partialValue = sumRows(statusRows(filtered, 'partial_reconciled'), [
      ...config.matchedFields,
      ...config.amountFields,
    ]);
    const openRows = filtered.filter((row) => row.status !== 'reconciled');
    const openValue = sumRows(openRows, config.amountFields);
    const reconRate = filtered.length
      ? (statusRows(filtered, 'reconciled').length / filtered.length) * 100
      : 0;
    const exceptionRate = filtered.length
      ? (openRows.length / filtered.length) * 100
      : 0;
    const monthly = buildMonthly(filtered, config);
    const clients = topClients(filtered, config);
    const ageing = ageingBreakdown(filtered, config);

    return {
      filtered,
      totalValue,
      matchedValue,
      partialValue,
      openValue,
      reconRate,
      exceptionRate,
      monthly,
      clients,
      ageing,
      statuses: statusBreakdown(filtered),
      queue: riskQueue(filtered, config),
    };
  }, [config, filters, rows]);

  const adviceSummary = useMemo(() => {
    const total = sumRows(advices, ['received_amount', 'total_amount']);
    const reconciled = statusRows(advices, 'reconciled');
    const exceptions = advices.filter((row) => row.status !== 'reconciled');
    return {
      total,
      count: advices.length,
      reconciled: reconciled.length,
      exceptions: exceptions.length,
      exceptionValue: sumRows(exceptions, ['received_amount', 'total_amount']),
    };
  }, [advices]);

  const activeFilterCount = [
    filters.query,
    filters.status !== 'all',
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({
      query: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
  }

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Executive Reconciliation Dashboard"
      subtitle="Realtime invoice, payment and advice intelligence for faster close decisions"
    >
      <section className="px-5 py-5">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertTriangle className="shrink-0" size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_50%,#fff7ed_100%)] px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-cyan-200 shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Reconciliation control tower
                </h2>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {analytics.filtered.length} of {rows.length} {config.unit}{' '}
                  visible
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                {[
                  ['invoice', 'Invoice tab'],
                  ['payment', 'Payment tab'],
                ].map(([value, label]) => (
                  <button
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      view === value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="relative min-w-0 lg:w-[25rem]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Search client, invoice, reference or bank"
                  value={filters.query}
                  onChange={(event) =>
                    updateFilter('query', event.target.value)
                  }
                />
              </label>
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

          {showFilters && (
            <div className="border-b border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-950">
                  Dashboard filters
                </p>
                <button
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  type="button"
                  onClick={() => setShowFilters(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <select
                  className="h-10 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter('status', event.target.value)
                  }
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    updateFilter('dateFrom', event.target.value)
                  }
                />
                <input
                  className="h-10 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    updateFilter('dateTo', event.target.value)
                  }
                />
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

          {isLoading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading realtime dashboard...
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <MetricTile
                  Icon={view === 'invoice' ? ReceiptText : Banknote}
                  label={`Total ${config.label}`}
                  tone="from-indigo-700 via-blue-700 to-cyan-600"
                  value={currency(analytics.totalValue)}
                  meta={`${analytics.filtered.length} ${config.unit}`}
                />
                <MetricTile
                  Icon={CheckCircle2}
                  label="Reconciled"
                  tone="from-emerald-700 via-teal-600 to-lime-500"
                  value={currency(analytics.matchedValue)}
                  meta={percent(analytics.reconRate)}
                />
                <MetricTile
                  Icon={Split}
                  label="Partial"
                  tone="from-amber-600 via-orange-500 to-rose-500"
                  value={currency(analytics.partialValue)}
                  meta={`${statusRows(analytics.filtered, 'partial_reconciled').length} records`}
                />
                <MetricTile
                  Icon={AlertTriangle}
                  label="Open exposure"
                  tone="from-rose-600 via-orange-500 to-amber-400"
                  value={currency(analytics.openValue)}
                  meta={percent(analytics.exceptionRate)}
                />
                <MetricTile
                  Icon={Mail}
                  label="Advice queue"
                  tone="from-violet-700 via-indigo-700 to-blue-600"
                  value={currency(adviceSummary.exceptionValue)}
                  meta={`${adviceSummary.exceptions} pending`}
                />
                <MetricTile
                  Icon={FileText}
                  label="Uploaded files"
                  tone="from-slate-800 via-slate-700 to-blue-700"
                  value={documents.length}
                  meta="documents parsed"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                <ChartCard
                  description="Month-wise total volume compared with reconciled throughput."
                  title="Reconciliation Trends"
                >
                  <LineTrendChart items={analytics.monthly} />
                </ChartCard>
                <ChartCard
                  description="Current filtered queue by reconciliation status."
                  title="Status Breakdown"
                >
                  <DonutChart items={analytics.statuses} />
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ChartCard
                  description="Total, reconciled, partial and open volume by month."
                  title="Monthly Volume Comparison"
                >
                  <StackedBarChart items={analytics.monthly} />
                </ChartCard>
                <ChartCard
                  description="Largest clients by financial volume and exception amount."
                  title="Top Clients by Volume"
                >
                  <TopClientsChart items={analytics.clients} />
                </ChartCard>
                <ChartCard
                  description="Receivables or receipts grouped by age to focus collection review."
                  title="Ageing Analysis"
                >
                  <AgeingChart items={analytics.ageing} />
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <ChartCard
                  description="How much filtered work is already closed versus requiring attention."
                  title="Close Efficiency"
                >
                  <GaugeChart
                    label="Reconciliation rate"
                    value={analytics.reconRate}
                  />
                </ChartCard>
                <ChartCard
                  description="Highest-value unmatched or partial items that deserve attention first."
                  title="Priority Exception Queue"
                >
                  <RiskQueue rows={analytics.queue} />
                </ChartCard>
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function MetricTile({ label, value, meta, Icon, tone }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-sm ${tone}`}
    >
      <div className="absolute -right-9 -top-12 h-28 w-28 rotate-12 rounded-[2rem] border border-white/15 bg-white/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">
            {value}
          </p>
          <span className="mt-2 inline-flex rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white">
            {meta}
          </span>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {description}
          </p>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <BarChart3 size={16} />
        </div>
      </div>
      {children}
    </article>
  );
}

function EmptyChart({ label = 'No data available for these filters' }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-400 ring-1 ring-slate-100">
      {label}
    </div>
  );
}

function LineTrendChart({ items }) {
  if (!items.length) return <EmptyChart />;
  const maxValue = Math.max(
    ...items.map((item) => item.total),
    ...items.map((item) => item.reconciled),
    1,
  );
  const pointsFor = (key) =>
    items
      .map((item, index) => {
        const x = items.length === 1 ? 50 : (index / (items.length - 1)) * 100;
        const y = 88 - ((item[key] || 0) / maxValue) * 72;
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div>
      <svg
        className="h-64 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="dashTrendTotal" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#2563eb" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="dashTrendRecon" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#84cc16" />
          </linearGradient>
        </defs>
        {[16, 34, 52, 70, 88].map((y) => (
          <line
            key={y}
            stroke="#e2e8f0"
            strokeDasharray="2 3"
            strokeWidth="0.35"
            x1="0"
            x2="100"
            y1={y}
            y2={y}
          />
        ))}
        <polyline
          fill="none"
          points={pointsFor('total')}
          stroke="url(#dashTrendTotal)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={pointsFor('reconciled')}
          stroke="url(#dashTrendRecon)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-semibold text-slate-500 md:grid-cols-8">
        {items.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 text-blue-700">
          <span className="h-2 w-5 rounded-full bg-blue-600" />
          Total volume
        </span>
        <span className="inline-flex items-center gap-2 text-emerald-700">
          <span className="h-2 w-5 rounded-full bg-emerald-500" />
          Reconciled
        </span>
      </div>
    </div>
  );
}

function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <EmptyChart />;
  let cursor = 0;
  const gradient = items
    .map((item) => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="grid min-h-64 gap-4 sm:grid-cols-[12rem_1fr] sm:items-center">
      <div className="relative mx-auto h-44 w-44">
        <div
          className="h-full w-full rounded-full shadow-inner ring-1 ring-slate-200"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="absolute inset-9 grid place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-2xl font-semibold text-slate-950">{total}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              records
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
            key={item.label}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
            <span className="text-sm font-bold text-slate-950">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedBarChart({ items }) {
  if (!items.length) return <EmptyChart />;
  const maxValue = Math.max(...items.map((item) => item.total), 1);

  return (
    <div className="flex h-64 items-end gap-3 rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
      {items.map((item) => (
        <div
          className="flex min-w-0 flex-1 flex-col items-center"
          key={item.label}
        >
          <div className="mb-2 text-[11px] font-bold text-slate-500">
            {compact(item.total)}
          </div>
          <div
            className="flex w-full flex-col justify-end overflow-hidden rounded-t-lg bg-white shadow-sm ring-1 ring-slate-100"
            style={{
              height: `${Math.max((item.total / maxValue) * 170, 10)}px`,
            }}
          >
            <div
              className="bg-rose-400"
              style={{
                height: `${item.total ? (item.open / item.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-amber-400"
              style={{
                height: `${item.total ? (item.partial / item.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-emerald-500"
              style={{
                height: `${item.total ? (item.reconciled / item.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 truncate text-[11px] font-semibold text-slate-500">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopClientsChart({ items }) {
  if (!items.length) return <EmptyChart />;
  const maxValue = Math.max(...items.map((item) => item.total), 1);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="truncate text-slate-700">
              {index + 1}. {item.label}
            </span>
            <span className="shrink-0 text-slate-950">
              {currency(item.total)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400"
              style={{
                width: `${Math.max((item.total / maxValue) * 100, 4)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-400">
            <span>{item.count} records</span>
            <span>{currency(item.exceptions)} open</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgeingChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <EmptyChart />;
  const tones = [
    'bg-emerald-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-slate-400',
  ];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          className="grid grid-cols-[5.5rem_1fr_4.75rem] items-center gap-3"
          key={item.label}
        >
          <span className="text-xs font-semibold text-slate-600">
            {item.label}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${tones[index]}`}
              style={{
                width: `${Math.max((item.count / total) * 100, item.count ? 6 : 0)}%`,
              }}
            />
          </div>
          <span className="text-right text-xs font-bold text-slate-950">
            {item.count} · {compact(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function GaugeChart({ value, label }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));
  return (
    <div className="grid min-h-56 place-items-center">
      <div className="relative h-44 w-44">
        <div
          className="h-full w-full rounded-full shadow-inner ring-1 ring-slate-200"
          style={{
            background: `conic-gradient(#10b981 0% ${safeValue}%, #e2e8f0 ${safeValue}% 100%)`,
          }}
        />
        <div className="absolute inset-8 grid place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-3xl font-semibold text-slate-950">
              {percent(safeValue)}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskQueue({ rows }) {
  if (!rows.length)
    return <EmptyChart label="No open exceptions for these filters" />;

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[32%]" />
          <col className="w-[17%]" />
          <col className="w-[15%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Record</th>
            <th className="px-3 py-3">Client</th>
            <th className="px-3 py-3">Amount</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {rows.map((row) => (
            <tr className="hover:bg-cyan-50/60" key={row.id}>
              <td className="truncate px-3 py-3 font-semibold text-slate-950">
                {row.label}
              </td>
              <td className="truncate px-3 py-3 text-slate-600">
                {row.client}
              </td>
              <td className="px-3 py-3 font-semibold text-orange-700">
                {currency(row.amount)}
              </td>
              <td className="px-3 py-3 text-slate-600">
                {formatDate(row.date)}
              </td>
              <td className="px-3 py-3">
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  {statusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
