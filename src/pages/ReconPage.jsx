import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Filter,
  GitCompareArrows,
  Loader2,
  Link2Off,
  Search,
  Sparkles,
  Split,
  TrendingUp,
  X,
} from 'lucide-react';

import AppShell from '../components/layout/AppShell';
import {
  listReconciliationMatches,
  unmatchReconciliation,
} from '../api/documents';

const statusOptions = [
  ['all', 'All statuses'],
  ['reconciled', 'Reconciled'],
  ['partial_reconciled', 'Partial reconciled'],
  ['unreconciled', 'Unreconciled'],
];

const relationshipOptions = [
  ['all', 'All'],
  ['one_to_one', 'One to one'],
  ['one_to_many', 'One invoice, many payments'],
  ['many_to_one', 'Many invoices, one payment'],
  ['many_to_many', 'Many to many'],
];

const MATCH_TOLERANCE = 25;

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function statusLabel(status) {
  return {
    reconciled: 'Reconciled',
    partial_reconciled: 'Partial reconciled',
    unreconciled: 'Unreconciled',
  }[status];
}

function StatusBadge({ status }) {
  const styles = {
    reconciled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    partial_reconciled: 'border-amber-200 bg-amber-50 text-amber-700',
    unreconciled: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <span
      className={`inline-flex max-w-full whitespace-normal rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-tight ${
        styles[status] ?? styles.unreconciled
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function getAmountStatus(subjectAmount, allocatedAmount) {
  if (!subjectAmount || allocatedAmount === 0) return 'unreconciled';
  if (Math.abs(subjectAmount - allocatedAmount) <= MATCH_TOLERANCE) {
    return 'reconciled';
  }
  return 'partial_reconciled';
}

function getInvoiceKey(row) {
  return row.invoiceId || row.invoiceNumber;
}

function getPaymentKey(row) {
  if (row.paymentNumber === '—') return '';
  return row.paymentId || `${row.paymentNumber}-${row.accountNumber}`;
}

function buildRelationIndex(rows) {
  const index = rows.reduce(
    (index, row) => {
      const invoiceKey = getInvoiceKey(row);
      const paymentKey = getPaymentKey(row);
      if (!invoiceKey || !paymentKey) return index;

      if (!index.paymentsByInvoice.has(invoiceKey)) {
        index.paymentsByInvoice.set(invoiceKey, new Set());
      }
      index.paymentsByInvoice.get(invoiceKey).add(paymentKey);

      if (!index.invoicesByPayment.has(paymentKey)) {
        index.invoicesByPayment.set(paymentKey, new Set());
      }
      index.invoicesByPayment.get(paymentKey).add(invoiceKey);

      return index;
    },
    {
      paymentsByInvoice: new Map(),
      invoicesByPayment: new Map(),
      componentByInvoice: new Map(),
      componentByPayment: new Map(),
    },
  );
  buildRelationComponents(index);
  return index;
}

function buildRelationComponents(index) {
  let componentIndex = 0;
  const visitedInvoices = new Set();
  const visitedPayments = new Set();

  for (const invoiceKey of index.paymentsByInvoice.keys()) {
    if (visitedInvoices.has(invoiceKey)) continue;
    componentIndex += 1;
    const componentKey = `component-${componentIndex}`;
    const invoiceQueue = [invoiceKey];
    const paymentQueue = [];

    while (invoiceQueue.length || paymentQueue.length) {
      const currentInvoice = invoiceQueue.shift();
      if (currentInvoice && !visitedInvoices.has(currentInvoice)) {
        visitedInvoices.add(currentInvoice);
        index.componentByInvoice.set(currentInvoice, componentKey);
        for (const paymentKey of index.paymentsByInvoice.get(currentInvoice) ??
          []) {
          if (!visitedPayments.has(paymentKey)) paymentQueue.push(paymentKey);
        }
      }

      const currentPayment = paymentQueue.shift();
      if (currentPayment && !visitedPayments.has(currentPayment)) {
        visitedPayments.add(currentPayment);
        index.componentByPayment.set(currentPayment, componentKey);
        for (const invoiceKey of index.invoicesByPayment.get(currentPayment) ??
          []) {
          if (!visitedInvoices.has(invoiceKey)) invoiceQueue.push(invoiceKey);
        }
      }
    }
  }
}

function getRelationType(groupRows, relationIndex) {
  const invoiceCount = Math.max(
    ...groupRows.map(
      (row) =>
        relationIndex.invoicesByPayment.get(getPaymentKey(row))?.size ?? 0,
    ),
    1,
  );
  const paymentCount = Math.max(
    ...groupRows.map(
      (row) =>
        relationIndex.paymentsByInvoice.get(getInvoiceKey(row))?.size ?? 0,
    ),
    0,
  );
  if (invoiceCount > 1 && paymentCount > 1) {
    return 'Many invoices to many payments';
  }
  if (invoiceCount > 1) return 'Many invoices to one payment';
  if (paymentCount > 1) return 'One invoice to many payments';
  if (paymentCount === 0) return 'Unmatched invoice';
  return 'One invoice to one payment';
}

function getRelationMeta(relationType) {
  return (
    {
      'Many invoices to many payments': {
        label: 'Many-to-many',
        tone: 'violet',
      },
      'One invoice to many payments': {
        label: 'Split invoice',
        tone: 'cyan',
      },
      'Many invoices to one payment': {
        label: 'Many invoices',
        tone: 'amber',
      },
      'One invoice to one payment': {
        label: 'Single match',
        tone: 'emerald',
      },
      'Unmatched invoice': {
        label: 'Open',
        tone: 'rose',
      },
    }[relationType] ?? {
      label: 'Match',
      tone: 'slate',
    }
  );
}

function getRelationshipValue(relationType) {
  return (
    {
      'One invoice to one payment': 'one_to_one',
      'One invoice to many payments': 'one_to_many',
      'Many invoices to one payment': 'many_to_one',
      'Many invoices to many payments': 'many_to_many',
      'Unmatched invoice': 'open',
    }[relationType] ?? 'all'
  );
}

function sortGroupItems(items, perspective) {
  const primaryGetter =
    perspective === 'payment' ? getPaymentKey : getInvoiceKey;
  const secondaryGetter =
    perspective === 'payment' ? getInvoiceKey : getPaymentKey;

  return [...items].sort((first, second) => {
    const primaryCompare = String(primaryGetter(first) || '').localeCompare(
      String(primaryGetter(second) || ''),
    );
    if (primaryCompare !== 0) return primaryCompare;

    const secondaryCompare = String(secondaryGetter(first) || '').localeCompare(
      String(secondaryGetter(second) || ''),
    );
    if (secondaryCompare !== 0) return secondaryCompare;

    return String(first.id).localeCompare(String(second.id));
  });
}

function groupRows(rows, perspective, allRows = rows) {
  const relationIndex = buildRelationIndex(allRows);
  const keyFor = (row) => {
    const invoiceKey = getInvoiceKey(row);
    const paymentKey = getPaymentKey(row);
    return (
      relationIndex.componentByInvoice.get(invoiceKey) ||
      relationIndex.componentByPayment.get(paymentKey) ||
      invoiceKey ||
      paymentKey ||
      row.id
    );
  };
  return Array.from(
    rows
      .reduce((groups, row) => {
        const key = keyFor(row);
        const existing = groups.get(key) ?? [];
        groups.set(key, [...existing, row]);
        return groups;
      }, new Map())
      .entries(),
  ).map(([key, items]) => {
    const sortedItems = sortGroupItems(items, perspective);
    const allocatedTotal = items.reduce(
      (total, row) => total + row.allocatedAmount,
      0,
    );
    const relationType = getRelationType(items, relationIndex);
    return {
      key,
      items: sortedItems,
      relationType,
      relationMeta: getRelationMeta(relationType),
      relationshipValue: getRelationshipValue(relationType),
      allocatedTotal,
    };
  });
}

function buildSpans(items, keyGetter) {
  const spans = items.map(() => ({ shouldRender: false, rowSpan: 0 }));
  let index = 0;

  while (index < items.length) {
    const key = keyGetter(items[index]) || items[index].id;
    let end = index + 1;

    while (end < items.length) {
      const nextKey = keyGetter(items[end]) || items[end].id;
      if (nextKey !== key) break;
      end += 1;
    }

    spans[index] = { shouldRender: true, rowSpan: end - index };
    index = end;
  }

  return spans;
}

function buildOutcomeSummaries(items, perspective) {
  const keyGetter = perspective === 'payment' ? getPaymentKey : getInvoiceKey;
  const amountGetter =
    perspective === 'payment'
      ? (row) => Number(row.totalAmount) || 0
      : (row) => Number(row.invoiceAmount) || 0;
  const summaries = new Map();

  for (const row of items) {
    const key = keyGetter(row) || row.id;
    const summary = summaries.get(key) ?? {
      subjectAmount: amountGetter(row),
      allocatedAmount: 0,
    };
    summary.allocatedAmount += Number(row.allocatedAmount) || 0;
    summaries.set(key, summary);
  }

  for (const summary of summaries.values()) {
    summary.varianceAmount = summary.subjectAmount - summary.allocatedAmount;
    summary.status = getAmountStatus(
      summary.subjectAmount,
      summary.allocatedAmount,
    );
  }

  return summaries;
}

function mapMatchToRow(match) {
  return {
    id: match.id,
    invoiceId: match.invoice,
    paymentId: match.bank_transaction,
    invoiceNumber: match.invoice_number || '—',
    clientName: match.client_name || '—',
    invoiceDate: match.invoice_date || '',
    invoiceAmount: Number(match.invoice_amount) || 0,
    accountNumber: match.account_number || '—',
    bankName: match.bank_name || '—',
    paymentNumber: match.payment_number || match.bank_reference_no || '—',
    paymentDate: match.payment_date || '',
    totalAmount: Number(match.payment_amount) || 0,
    allocatedAmount: Number(match.allocated_amount) || 0,
    status: match.status || 'unreconciled',
    comments: match.comments || match.match_method_display || '',
  };
}

export default function ReconPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [perspective, setPerspective] = useState('invoice');
  const [relationship, setRelationship] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await listReconciliationMatches();
      setRows((response.results ?? []).map(mapMatchToRow));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reconciliation matches.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status;
      const matchesQuery =
        !normalizedQuery ||
        row.invoiceNumber.toLowerCase().includes(normalizedQuery) ||
        row.clientName.toLowerCase().includes(normalizedQuery) ||
        row.paymentNumber.toLowerCase().includes(normalizedQuery) ||
        row.bankName.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, rows, status]);

  const allGroupedRows = useMemo(
    () => groupRows(filteredRows, perspective, rows),
    [filteredRows, perspective, rows],
  );

  const groupedRows = useMemo(
    () =>
      allGroupedRows.filter(
        (group) =>
          relationship === 'all' || group.relationshipValue === relationship,
      ),
    [allGroupedRows, relationship],
  );

  const totalAllocated = rows.reduce(
    (total, row) => total + row.allocatedAmount,
    0,
  );
  const partialCount = rows.filter(
    (row) => row.status === 'partial_reconciled',
  ).length;
  const unreconciledCount = rows.filter(
    (row) => row.status === 'unreconciled',
  ).length;

  async function handleUnmatch(rowId) {
    setError('');
    try {
      await unmatchReconciliation(rowId);
      await loadMatches();
    } catch (unmatchError) {
      setError(unmatchError.message || 'Unable to remove this match.');
    }
  }

  return (
    <AppShell
      eyebrow="Recon"
      title="Reconciliation Workspace"
      subtitle="Review invoice-to-payment allocations across one-to-many and many-to-one matches"
    >
      <section className="px-5 py-5">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
          {[
            {
              label: 'Allocated Amount',
              value: currency(totalAllocated),
              count: `${rows.length} allocation lines`,
              Icon: GitCompareArrows,
              className: 'from-indigo-700 via-blue-700 to-cyan-600',
            },
            {
              label: 'Partial Matches',
              value: partialCount,
              count: 'need balance review',
              Icon: Split,
              className: 'from-amber-600 via-orange-500 to-rose-500',
            },
            {
              label: 'Unreconciled',
              value: unreconciledCount,
              count: 'ready for manual match',
              Icon: TrendingUp,
              className: 'from-emerald-700 via-teal-600 to-lime-500',
            },
          ].map((kpi) => (
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
                  <span className="mt-3 inline-flex rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
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

        <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_50%,#fff8ed_100%)] px-4 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-cyan-200 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Match Review Ledger
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {filteredRows.length} allocation lines ·{' '}
                    {groupedRows.length} groups
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                  {[
                    ['invoice', 'Invoice view'],
                    ['payment', 'Payment view'],
                  ].map(([value, label]) => (
                    <button
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        perspective === value
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                      key={value}
                      type="button"
                      onClick={() => setPerspective(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <select
                  className="h-10 rounded-lg bg-white px-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                >
                  {relationshipOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="relative min-w-0 lg:w-[25rem]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Search invoice, client, payment or bank"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                >
                  <Filter size={16} />
                  Filter
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-950">
                    Filter reconciliation rows
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
                    onChange={(event) => setStatus(event.target.value)}
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
                    onClick={() => {
                      setQuery('');
                      setStatus('all');
                      setRelationship('all');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[13px]">
              <ReconColGroup perspective={perspective} />
              <thead className="bg-white text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th
                    className="bg-blue-50/80 px-2 py-2 text-blue-700"
                    colSpan={4}
                  >
                    Invoice fields
                  </th>
                  <th
                    className="bg-cyan-50/80 px-2 py-2 text-cyan-700"
                    colSpan={5}
                  >
                    Payments
                  </th>
                  <th
                    className="bg-slate-100 px-2 py-2 text-slate-700"
                    colSpan={5}
                  >
                    {perspective === 'payment'
                      ? 'Payment view outcome'
                      : 'Invoice view outcome'}
                  </th>
                </tr>
                <ReconHeaderRow perspective={perspective} />
              </thead>
              {!isLoading &&
                groupedRows.map((group) => (
                  <ReconGroupRows
                    group={group}
                    handleUnmatch={handleUnmatch}
                    key={group.key}
                    perspective={perspective}
                  />
                ))}
            </table>
          </div>

          {isLoading && (
            <div className="p-10 text-center">
              <Loader2
                className="mx-auto animate-spin text-blue-500"
                size={34}
              />
              <p className="mt-3 text-lg font-semibold text-slate-950">
                Loading reconciliation matches...
              </p>
            </div>
          )}

          {!isLoading && groupedRows.length === 0 && (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto text-slate-300" size={34} />
              <p className="mt-3 text-lg font-semibold text-slate-950">
                No reconciliation matches yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Payment advice sync triggers the backend reconciliation
                scheduler path. New matches will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function ReconGroupRows({ group, handleUnmatch, perspective }) {
  const dividerStyles = {
    violet: 'border-t-violet-400',
    cyan: 'border-t-cyan-400',
    amber: 'border-t-amber-400',
    emerald: 'border-t-emerald-200',
    rose: 'border-t-rose-400',
    slate: 'border-t-slate-200',
  };
  const groupTintStyles = {
    violet: 'bg-violet-50/80 group-hover:bg-violet-100',
    cyan: 'bg-cyan-50/80 group-hover:bg-cyan-100',
    amber: 'bg-amber-50/80 group-hover:bg-amber-100',
    emerald: 'bg-emerald-50/45 group-hover:bg-emerald-50',
    rose: 'bg-rose-50/65 group-hover:bg-rose-100',
    slate: 'bg-white group-hover:bg-slate-50',
  };
  const dividerClass =
    dividerStyles[group.relationMeta.tone] ?? dividerStyles.slate;
  const tintClass =
    groupTintStyles[group.relationMeta.tone] ?? groupTintStyles.slate;
  const invoiceSpans = buildSpans(group.items, getInvoiceKey);
  const paymentSpans = buildSpans(group.items, getPaymentKey);
  const outcomeKeyGetter =
    perspective === 'payment' ? getPaymentKey : getInvoiceKey;
  const outcomeSpans = buildSpans(group.items, outcomeKeyGetter);
  const outcomeSummaries = buildOutcomeSummaries(group.items, perspective);

  return (
    <tbody className="group font-medium">
      {group.items.map((row, index) => {
        const invoiceSpan = invoiceSpans[index];
        const paymentSpan = paymentSpans[index];
        const outcomeSpan = outcomeSpans[index];
        const outcomeKey = outcomeKeyGetter(row) || row.id;
        const outcomeSummary = outcomeSummaries.get(outcomeKey);

        return (
          <tr
            className={`align-top transition-colors ${
              index === 0 ? `border-t-2 ${dividerClass}` : ''
            }`}
            key={row.id}
          >
            {invoiceSpan.shouldRender && (
              <InvoiceCells
                cellClass={tintClass}
                isGroupStart={index === 0}
                relationType={index === 0 ? group.relationType : null}
                row={row}
                rowSpan={invoiceSpan.rowSpan}
              />
            )}
            {paymentSpan.shouldRender && (
              <PaymentCells
                cellClass={tintClass}
                isGroupStart={index === 0}
                perspective={perspective}
                relationType={index === 0 ? group.relationType : null}
                row={row}
                rowSpan={paymentSpan.rowSpan}
              />
            )}
            {outcomeSpan.shouldRender && (
              <OutcomeCells
                cellClass={tintClass}
                rowSpan={outcomeSpan.rowSpan}
                summary={outcomeSummary}
              />
            )}
            <td
              className={`px-2 py-3 text-[11px] font-medium leading-5 text-slate-500 transition-colors ${tintClass}`}
            >
              <span className="line-clamp-2" title={row.comments}>
                {row.comments}
              </span>
            </td>
            <td className={`px-2 py-3 transition-colors ${tintClass}`}>
              {row.paymentNumber !== '—' ? (
                <button
                  aria-label={`Unmatch ${row.invoiceNumber} from ${row.paymentNumber}`}
                  className="grid h-8 w-8 place-items-center rounded-md border border-rose-200 bg-white text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md"
                  title="Unmatch"
                  type="button"
                  onClick={() => handleUnmatch(row.id)}
                >
                  <Link2Off size={14} />
                </button>
              ) : (
                <span className="text-xs font-semibold text-slate-400">—</span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

function OutcomeCells({ cellClass, summary, rowSpan }) {
  const variance = summary?.varianceAmount ?? 0;

  return (
    <>
      <td
        className={`border-l-2 border-slate-300 px-2 py-3 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        <StatusBadge status={summary?.status ?? 'unreconciled'} />
      </td>
      <td
        className={`px-2 py-3 font-semibold text-emerald-700 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {currency(summary?.allocatedAmount)}
      </td>
      <td
        className={`px-2 py-3 font-semibold transition-colors ${cellClass} ${
          Math.abs(variance) <= MATCH_TOLERANCE
            ? 'text-emerald-700'
            : 'text-orange-700'
        }`}
        rowSpan={rowSpan}
      >
        {currency(variance)}
      </td>
    </>
  );
}

function RelationHint({ children, perspective, section }) {
  const styles = {
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  if (!children) return null;

  const meta = getRelationMeta(children);
  const labelOverrides = {
    payment: {
      'One invoice to many payments': 'Same invoice',
      'Many invoices to one payment': 'Shared payment',
    },
    invoice: {
      'One invoice to many payments': 'Split invoice',
      'Many invoices to one payment': 'Many invoices',
    },
  };
  const label =
    labelOverrides[section]?.[children] ??
    labelOverrides[perspective]?.[children] ??
    meta.label;

  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold leading-none ${
        styles[meta.tone] ?? styles.slate
      }`}
      title={children}
    >
      {label}
    </span>
  );
}

function InvoiceCells({ cellClass, row, rowSpan, relationType, isGroupStart }) {
  return (
    <>
      <td
        className={`border-l-2 px-2 py-3 font-bold text-slate-950 transition-colors ${cellClass} ${
          isGroupStart ? 'border-l-blue-300' : 'border-l-slate-100'
        }`}
        rowSpan={rowSpan}
      >
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="max-w-full whitespace-nowrap text-[12px] tracking-tight">
            {row.invoiceNumber}
          </span>
          <RelationHint section="invoice">{relationType}</RelationHint>
        </div>
      </td>
      <td
        className={`break-words px-2 py-3 text-slate-700 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {row.clientName}
      </td>
      <td
        className={`px-2 py-3 text-slate-600 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {formatDate(row.invoiceDate)}
      </td>
      <td
        className={`px-2 py-3 font-semibold text-slate-950 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {currency(row.invoiceAmount)}
      </td>
    </>
  );
}

function PaymentCells({
  cellClass,
  row,
  rowSpan,
  relationType,
  isGroupStart,
  perspective,
}) {
  return (
    <>
      <td
        className={`break-all border-l-2 px-2 py-3 text-slate-700 transition-colors ${cellClass} ${
          isGroupStart ? 'border-l-cyan-300' : 'border-l-slate-100'
        }`}
        rowSpan={rowSpan}
      >
        {row.accountNumber}
      </td>
      <td
        className={`break-words px-2 py-3 text-slate-700 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {row.bankName}
      </td>
      <td
        className={`px-2 py-3 font-bold text-slate-950 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="max-w-full whitespace-nowrap text-[12px] tracking-tight">
            {row.paymentNumber}
          </span>
          <RelationHint perspective={perspective} section="payment">
            {relationType}
          </RelationHint>
        </div>
      </td>
      <td
        className={`px-2 py-3 text-slate-600 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {formatDate(row.paymentDate)}
      </td>
      <td
        className={`px-2 py-3 font-semibold text-slate-950 transition-colors ${cellClass}`}
        rowSpan={rowSpan}
      >
        {currency(row.totalAmount)}
      </td>
    </>
  );
}

function ReconColGroup() {
  const widths = [11, 12, 8, 8, 6, 8, 8, 6, 8, 5, 5, 5, 6, 4];

  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={`${width}-${index}`} style={{ width: `${width}%` }} />
      ))}
    </colgroup>
  );
}

function ReconHeaderRow({ perspective }) {
  return (
    <tr>
      <th className="border-l-2 border-blue-200 px-2 py-3">Invoice #</th>
      <th className="px-2 py-3">Client name</th>
      <th className="px-2 py-3">Invoice date</th>
      <th className="px-2 py-3">Invoice Amt</th>
      <th className="border-l-2 border-cyan-200 px-2 py-3">Acc. No.</th>
      <th className="px-2 py-3">Bank name</th>
      <th className="px-2 py-3">Payment #</th>
      <th className="px-2 py-3">Payment date</th>
      <th className="px-2 py-3">Total amount</th>
      <th className="border-l-2 border-slate-300 px-2 py-3">Status</th>
      <th className="px-2 py-3">
        {perspective === 'payment'
          ? 'Allocated on payment'
          : 'Allocated on invoice'}
      </th>
      <th className="px-2 py-3">
        {perspective === 'payment' ? 'Payment variance' : 'Invoice variance'}
      </th>
      <th className="px-2 py-3">Comments</th>
      <th className="px-2 py-3">Unmatch</th>
    </tr>
  );
}
