import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  Circle,
  Eye,
  Filter,
  ReceiptText,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';

import AppShell from '../components/layout/AppShell';
import {
  listBankTransactions,
  listInvoices,
  listReconciliationMatches,
  unmatchReconciliation,
} from '../api/documents';

const statusOptions = [
  ['all', 'All statuses'],
  ['reconciled', 'Reconciled'],
  ['partial_reconciled', 'Partial reconciled'],
  ['unreconciled', 'Unreconciled'],
];

const sortOptions = [
  ['latest_uploaded', 'Latest uploaded'],
  ['oldest_uploaded', 'Oldest uploaded'],
  ['newest_invoice_date', 'Newest invoice date'],
  ['oldest_invoice_date', 'Oldest invoice date'],
  ['amount_high_low', 'Amount high to low'],
  ['amount_low_high', 'Amount low to high'],
];

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
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
      className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold capitalize leading-none ${
        styles[status] ?? styles.unreconciled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function getInvoiceStatus(matchedAmount, invoiceAmount) {
  if (matchedAmount >= invoiceAmount) return 'reconciled';
  if (matchedAmount > 0) return 'partial_reconciled';
  return 'unreconciled';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAgeing(dateValue) {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Math.max(Date.now() - date.getTime(), 0);
  const days = Math.floor(diff / 86_400_000);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function mapInvoice(row) {
  const invoiceAmount = toNumber(row.total_amount);
  const matchedAmount = toNumber(row.matched_amount);
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    reconciled: row.status === 'reconciled',
    clientName: row.client_name || 'Unknown client',
    invoiceDate: row.invoice_date,
    uploadedAt: row.created_at,
    invoiceAmount,
    matchedAmount,
    status: row.status,
    ageing: getAgeing(row.invoice_date),
    matchType:
      row.status === 'reconciled'
        ? 'Reconciled'
        : row.status === 'partial_reconciled'
          ? 'Partial match'
          : 'Unmatched',
  };
}

function mapPaymentCandidate(row) {
  const amount = toNumber(row.credit ?? row.amount);
  const allocatedAmount = toNumber(row.matched_amount);
  return {
    id: row.id,
    reference: row.bank_reference_no || row.id.slice(0, 8),
    payer: row.client_name || 'Unknown payer',
    date: row.transaction_date,
    amount,
    allocatedAmount: allocatedAmount || undefined,
    confidence: row.client_name ? 78 : 35,
    status: row.status === 'reconciled' ? 'Matched' : 'Suggested',
    invoiceId: undefined,
  };
}

export default function InvoicePage() {
  const pageSize = 12;
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [reconciliationMatches, setReconciliationMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('latest_uploaded');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState({});
  const [paymentQuery, setPaymentQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadInvoiceWorkspace() {
      setIsLoading(true);
      setLoadError('');
      try {
        const [invoiceResponse, transactionResponse, matchResponse] =
          await Promise.all([
            listInvoices(),
            listBankTransactions(),
            listReconciliationMatches(),
          ]);
        if (!isMounted) return;
        setInvoiceRows((invoiceResponse.results ?? []).map(mapInvoice));
        setPaymentRows(
          (transactionResponse.results ?? []).map(mapPaymentCandidate),
        );
        setReconciliationMatches(matchResponse.results ?? []);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error.message || 'Could not load invoice data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInvoiceWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return invoiceRows
      .filter((invoice) => {
        const matchesSearch =
          !normalizedQuery ||
          invoice.invoiceNumber.toLowerCase().includes(normalizedQuery) ||
          invoice.clientName.toLowerCase().includes(normalizedQuery);
        const matchesStatus = status === 'all' || invoice.status === status;
        const invoiceDate = new Date(invoice.invoiceDate);
        const matchesFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
        const matchesTo = !dateTo || invoiceDate <= new Date(dateTo);

        return matchesSearch && matchesStatus && matchesFrom && matchesTo;
      })
      .sort((left, right) => {
        const uploadedLeft = new Date(left.uploadedAt);
        const uploadedRight = new Date(right.uploadedAt);
        const invoiceDateLeft = new Date(left.invoiceDate);
        const invoiceDateRight = new Date(right.invoiceDate);
        const sorters = {
          latest_uploaded: uploadedRight - uploadedLeft,
          oldest_uploaded: uploadedLeft - uploadedRight,
          newest_invoice_date: invoiceDateRight - invoiceDateLeft,
          oldest_invoice_date: invoiceDateLeft - invoiceDateRight,
          amount_high_low: right.invoiceAmount - left.invoiceAmount,
          amount_low_high: left.invoiceAmount - right.invoiceAmount,
        };

        return sorters[sortBy] ?? sorters.latest_uploaded;
      });
  }, [dateFrom, dateTo, invoiceRows, query, sortBy, status]);

  const totalPages = Math.max(Math.ceil(filteredInvoices.length / pageSize), 1);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageStart =
    filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredInvoices.length);

  const activeFilterCount = [status !== 'all', dateFrom, dateTo].filter(
    Boolean,
  ).length;

  const totalInvoiceValue = invoiceRows.reduce(
    (total, invoice) => total + invoice.invoiceAmount,
    0,
  );
  const reconciledInvoiceRows = invoiceRows.filter(
    (invoice) => invoice.reconciled,
  );
  const reconciledInvoiceValue = reconciledInvoiceRows.reduce(
    (total, invoice) => total + invoice.invoiceAmount,
    0,
  );
  const unreconciledInvoiceRows = invoiceRows.filter(
    (invoice) => !invoice.reconciled,
  );
  const unreconciledInvoiceValue = unreconciledInvoiceRows.reduce(
    (total, invoice) =>
      total + Math.max(invoice.invoiceAmount - invoice.matchedAmount, 0),
    0,
  );

  const kpis = [
    {
      label: 'Total Invoices',
      value: currency(totalInvoiceValue),
      count: `${invoiceRows.length} invoices`,
      Icon: ReceiptText,
      className: 'from-indigo-700 via-blue-700 to-cyan-600',
      chip: 'bg-cyan-300/20 text-cyan-100',
    },
    {
      label: 'Reconciled Invoices',
      value: currency(reconciledInvoiceValue),
      count: `${reconciledInvoiceRows.length} invoices`,
      Icon: CheckCircle2,
      className: 'from-emerald-700 via-teal-600 to-lime-500',
      chip: 'bg-emerald-100/20 text-emerald-50',
    },
    {
      label: 'Unreconciled Invoices',
      value: currency(unreconciledInvoiceValue),
      count: `${unreconciledInvoiceRows.length} invoices`,
      Icon: TrendingUp,
      className: 'from-rose-600 via-orange-500 to-amber-400',
      chip: 'bg-pink-100/20 text-pink-50',
    },
  ];

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setSortBy('latest_uploaded');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }

  function openMatchDrawer(invoice) {
    setActiveInvoice(invoice);
    setPaymentQuery('');
    setSelectedPayments({});
  }

  function closeMatchDrawer() {
    setActiveInvoice(null);
    setPaymentQuery('');
    setSelectedPayments({});
  }

  function togglePayment(payment) {
    setSelectedPayments((current) => {
      if (current[payment.id]) {
        const next = { ...current };
        delete next[payment.id];
        return next;
      }

      const remainingBeforeSelection = activeInvoice
        ? activeInvoice.invoiceAmount -
          activeInvoice.matchedAmount -
          Object.values(current).reduce((total, value) => total + value, 0)
        : payment.amount;
      return {
        ...current,
        [payment.id]: Math.min(
          payment.amount,
          Math.max(remainingBeforeSelection, 0),
        ),
      };
    });
  }

  function updatePaymentAllocation(payment, value) {
    const parsedValue = Number(value);
    const safeValue = Number.isNaN(parsedValue)
      ? 0
      : Math.min(Math.max(parsedValue, 0), payment.amount);

    setSelectedPayments((current) => ({
      ...current,
      [payment.id]: safeValue,
    }));
  }

  async function removeExistingMatch(payment) {
    try {
      await unmatchReconciliation(payment.matchId);
      setReconciliationMatches((current) =>
        current.filter((match) => match.id !== payment.matchId),
      );
      const amountToRemove = payment.allocatedAmount ?? payment.amount;
      setInvoiceRows((current) =>
        current.map((invoice) => {
          if (!activeInvoice || invoice.id !== activeInvoice.id) return invoice;
          const nextMatchedAmount = Math.max(
            invoice.matchedAmount - amountToRemove,
            0,
          );
          return {
            ...invoice,
            matchedAmount: nextMatchedAmount,
            reconciled: nextMatchedAmount >= invoice.invoiceAmount,
            status: getInvoiceStatus(nextMatchedAmount, invoice.invoiceAmount),
            matchType: nextMatchedAmount > 0 ? 'Partial match' : 'Unmatched',
          };
        }),
      );
      setActiveInvoice((current) => {
        if (!current) return current;
        const nextMatchedAmount = Math.max(
          current.matchedAmount - amountToRemove,
          0,
        );
        return {
          ...current,
          matchedAmount: nextMatchedAmount,
          reconciled: nextMatchedAmount >= current.invoiceAmount,
          status: getInvoiceStatus(nextMatchedAmount, current.invoiceAmount),
          matchType: nextMatchedAmount > 0 ? 'Partial match' : 'Unmatched',
        };
      });
    } catch (error) {
      setLoadError(error.message || 'Could not remove this match.');
    }
  }

  function confirmManualMatch() {
    const allocations = Object.entries(selectedPayments).filter(
      ([, amount]) => amount > 0,
    );
    if (!activeInvoice || allocations.length === 0 || drawerOverMatched) return;

    setPaymentRows((current) =>
      current.map((payment) =>
        selectedPayments[payment.id]
          ? {
              ...payment,
              invoiceId: activeInvoice.id,
              status:
                selectedPayments[payment.id] >= payment.amount
                  ? 'Matched'
                  : 'Partially matched',
              allocatedAmount: selectedPayments[payment.id],
            }
          : payment,
      ),
    );
    setInvoiceRows((current) =>
      current.map((invoice) => {
        if (invoice.id !== activeInvoice.id) return invoice;
        const nextMatchedAmount = invoice.matchedAmount + selectedAmount;
        return {
          ...invoice,
          matchedAmount: nextMatchedAmount,
          reconciled: nextMatchedAmount >= invoice.invoiceAmount,
          status: getInvoiceStatus(nextMatchedAmount, invoice.invoiceAmount),
          matchType: allocations.length > 1 ? 'Split match' : 'Manual match',
        };
      }),
    );
    setActiveInvoice((current) => {
      if (!current) return current;
      const nextMatchedAmount = current.matchedAmount + selectedAmount;
      return {
        ...current,
        matchedAmount: nextMatchedAmount,
        reconciled: nextMatchedAmount >= current.invoiceAmount,
        status: getInvoiceStatus(nextMatchedAmount, current.invoiceAmount),
        matchType: allocations.length > 1 ? 'Split match' : 'Manual match',
      };
    });
    setSelectedPayments({});
  }

  const selectedAmount = useMemo(
    () =>
      Object.values(selectedPayments).reduce(
        (total, value) => total + value,
        0,
      ),
    [selectedPayments],
  );

  const selectedPaymentCount = Object.keys(selectedPayments).length;
  const hasSelectedAllocation = Object.values(selectedPayments).some(
    (value) => value > 0,
  );

  const drawerRemaining = activeInvoice
    ? Math.max(
        activeInvoice.invoiceAmount -
          activeInvoice.matchedAmount -
          selectedAmount,
        0,
      )
    : 0;

  const drawerOverMatched = activeInvoice
    ? activeInvoice.matchedAmount + selectedAmount > activeInvoice.invoiceAmount
    : false;
  const isActiveInvoiceReconciled = activeInvoice
    ? activeInvoice.matchedAmount >= activeInvoice.invoiceAmount
    : false;

  const drawerPayments = useMemo(() => {
    if (!activeInvoice) return [];
    const normalized = paymentQuery.trim().toLowerCase();
    return paymentRows.filter((payment) => {
      const isOpenCandidate = !reconciliationMatches.some(
        (match) => match.bank_transaction === payment.id,
      );
      const matchesInvoice =
        payment.payer === activeInvoice.clientName || normalized.length > 0;
      const matchesSearch =
        !normalized ||
        payment.reference.toLowerCase().includes(normalized) ||
        payment.payer.toLowerCase().includes(normalized) ||
        String(payment.amount).includes(normalized);
      return isOpenCandidate && matchesInvoice && matchesSearch;
    });
  }, [activeInvoice, paymentQuery, paymentRows, reconciliationMatches]);

  const existingMatches = useMemo(() => {
    if (!activeInvoice) return [];
    return reconciliationMatches
      .filter((match) => match.invoice === activeInvoice.id)
      .map((match) => ({
        id: match.bank_transaction,
        matchId: match.id,
        reference: match.bank_reference_no || match.payment_number,
        payer: match.client_name || match.bank_name,
        date: match.payment_date,
        amount: toNumber(match.payment_amount),
        allocatedAmount: toNumber(match.allocated_amount),
        status: match.status_display || match.status,
      }));
  }, [activeInvoice, reconciliationMatches]);

  return (
    <AppShell
      eyebrow="Invoices"
      title="Invoice Register"
      subtitle="Parsed invoice data ready for reconciliation review"
    >
      <section className="px-5 py-5">
        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError}
          </div>
        )}
        {isLoading && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            Loading parsed invoices and bank transactions...
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_0.95fr]">
          {kpis.map((kpi) => (
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${kpi.className}`}
              key={kpi.label}
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25" />
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-[2.25rem] border border-white/15 bg-white/10 rotate-12" />
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
                    Parsed Invoice Ledger
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {filteredInvoices.length} of {invoiceRows.length} records
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <label className="relative min-w-0 lg:w-[28rem]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Search invoice number or client"
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

            {showFilters && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    Filter invoices
                  </p>
                  <button
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    type="button"
                    onClick={() => setShowFilters(false)}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  <label className="flex h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200">
                    <CalendarDays className="text-slate-400" size={15} />
                    <input
                      className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                      type="date"
                      value={dateFrom}
                      onChange={(event) => {
                        setDateFrom(event.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 ring-1 ring-slate-200">
                    <ArrowDownUp className="text-slate-400" size={15} />
                    <input
                      className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                      type="date"
                      value={dateTo}
                      onChange={(event) => {
                        setDateTo(event.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </label>
                </div>
                <button
                  className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  type="button"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              </div>
            )}

            <div className="-mx-4 mt-4 border-t border-slate-200 bg-slate-50">
              <table className="w-full table-fixed text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[17%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="px-2 py-3">Invoice Number</th>
                    <th className="px-2 py-3">Client Name</th>
                    <th className="px-2 py-3">Invoice Date</th>
                    <th className="px-2 py-3">Invoice Amount</th>
                    <th className="px-2 py-3">Matched</th>
                    <th className="px-2 py-3">Remaining</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Ageing</th>
                    <th className="px-2 py-3">View</th>
                  </tr>
                </thead>
              </table>
            </div>
          </div>

          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[13px]">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[17%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead className="sr-only">
                <tr>
                  <th className="px-2 py-3">Invoice Number</th>
                  <th className="px-2 py-3">Client Name</th>
                  <th className="px-2 py-3">Invoice Date</th>
                  <th className="px-2 py-3">Invoice Amount</th>
                  <th className="px-2 py-3">Matched</th>
                  <th className="px-2 py-3">Remaining</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Ageing</th>
                  <th className="px-2 py-3">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedInvoices.map((invoice, index) => (
                  <tr
                    className={`transition hover:bg-cyan-50/80 ${
                      invoice.reconciled
                        ? 'bg-emerald-50/55 hover:bg-emerald-100/60'
                        : index % 2 === 1
                          ? 'bg-amber-50/45 hover:bg-amber-100/55'
                          : 'bg-cyan-50/55 hover:bg-cyan-100/60'
                    }`}
                    key={invoice.id}
                  >
                    <td className="truncate px-2 py-2.5 font-semibold text-slate-950">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="truncate px-2 py-2.5 text-slate-700">
                      {invoice.clientName}
                    </td>
                    <td className="truncate px-2 py-2.5 text-slate-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="truncate px-2 py-2.5 font-semibold text-slate-950">
                      {currency(invoice.invoiceAmount)}
                    </td>
                    <td className="truncate px-2 py-2.5 font-semibold text-emerald-700">
                      {currency(invoice.matchedAmount)}
                    </td>
                    <td className="truncate px-2 py-2.5 font-semibold text-orange-700">
                      {currency(invoice.invoiceAmount - invoice.matchedAmount)}
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                          invoice.reconciled
                            ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                        }`}
                      >
                        {invoice.ageing}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800"
                        type="button"
                        onClick={() => openMatchDrawer(invoice)}
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

          {filteredInvoices.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {pageStart}-{pageEnd} of {filteredInvoices.length}{' '}
                invoices
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

          {filteredInvoices.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-950">
                No invoices match these filters.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try clearing search, status, reconciliation or date filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {activeInvoice && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close invoice matching"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px]"
            type="button"
            onClick={closeMatchDrawer}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_32%),linear-gradient(135deg,#ffffff,#f1f7ff_52%,#ecfdf5)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Invoice to payment matching
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {activeInvoice.invoiceNumber}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {activeInvoice.clientName} ·{' '}
                    {new Date(activeInvoice.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  type="button"
                  onClick={closeMatchDrawer}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  [
                    'Invoice Amount',
                    activeInvoice.invoiceAmount,
                    'text-slate-950',
                    'bg-white',
                  ],
                  [
                    'Matched',
                    activeInvoice.matchedAmount + selectedAmount,
                    'text-emerald-700',
                    'bg-emerald-50',
                  ],
                  [
                    'Remaining',
                    drawerRemaining,
                    drawerOverMatched ? 'text-rose-700' : 'text-orange-700',
                    drawerOverMatched ? 'bg-rose-50' : 'bg-orange-50',
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
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Existing matches
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {activeInvoice.matchType}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {existingMatches.map((payment) => (
                    <div
                      className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-[1fr_auto_auto]"
                      key={payment.id}
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {payment.reference}
                        </p>
                        <p className="text-sm text-slate-500">
                          {payment.payer} ·{' '}
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">
                          {currency(payment.allocatedAmount ?? payment.amount)}
                        </p>
                        {(payment.allocatedAmount ?? payment.amount) <
                          payment.amount && (
                          <p className="text-xs font-medium text-slate-500">
                            of {currency(payment.amount)}
                          </p>
                        )}
                      </div>
                      <button
                        aria-label={`Unmatch ${payment.reference}`}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-50 hover:text-rose-700"
                        type="button"
                        onClick={() => removeExistingMatch(payment)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {existingMatches.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-500">
                      No payments linked yet.
                    </p>
                  )}
                </div>
              </section>

              {!isActiveInvoiceReconciled && (
                <section className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Suggested and manual payments
                    </h3>
                  </div>
                  <label className="relative mt-3 block">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Search payment reference, payer or amount"
                      value={paymentQuery}
                      onChange={(event) => setPaymentQuery(event.target.value)}
                    />
                  </label>
                  <div className="mt-3 space-y-2">
                    {drawerPayments.map((payment) => {
                      const selected =
                        selectedPayments[payment.id] !== undefined;
                      return (
                        <div
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selected
                              ? 'border-cyan-300 bg-cyan-50'
                              : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                          }`}
                          key={payment.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <button
                                className={`mt-0.5 grid h-5 w-5 place-items-center rounded-md border ${
                                  selected
                                    ? 'border-cyan-600 bg-cyan-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                                type="button"
                                onClick={() => togglePayment(payment)}
                              >
                                {selected ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <Circle size={10} />
                                )}
                              </button>
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {payment.reference}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {payment.payer} ·{' '}
                                  {new Date(payment.date).toLocaleDateString()}
                                </p>
                                <span className="mt-2 inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                                  {payment.confidence}% confidence
                                </span>
                              </div>
                            </div>
                            <p className="font-semibold text-slate-950">
                              {currency(payment.amount)}
                            </p>
                          </div>
                          {selected && (
                            <div className="mt-3 grid gap-2 border-t border-cyan-100 pt-3 sm:grid-cols-[1fr_10rem] sm:items-end">
                              <p className="text-xs font-medium text-slate-500">
                                Edit allocation if this payment should only be
                                partly applied to the invoice.
                              </p>
                              <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Allocate
                                </span>
                                <input
                                  className="mt-1 h-10 w-full rounded-lg bg-white px-3 text-sm font-semibold text-slate-950 ring-1 ring-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  min="0"
                                  max={payment.amount}
                                  step="0.01"
                                  type="number"
                                  value={selectedPayments[payment.id]}
                                  onChange={(event) =>
                                    updatePaymentAllocation(
                                      payment,
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {drawerPayments.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                        No candidate payments match this search. Try the
                        reference, payer name, or amount.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {!isActiveInvoiceReconciled && (
              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Selected: {currency(selectedAmount)}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Remaining after match: {currency(drawerRemaining)}
                    </p>
                    {drawerOverMatched && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        Selected payments exceed the invoice amount. Review
                        before confirming.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                      type="button"
                      onClick={() => setSelectedPayments({})}
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        selectedPaymentCount === 0 ||
                        !hasSelectedAllocation ||
                        drawerOverMatched
                      }
                      type="button"
                      onClick={confirmManualMatch}
                    >
                      Confirm match
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </AppShell>
  );
}
