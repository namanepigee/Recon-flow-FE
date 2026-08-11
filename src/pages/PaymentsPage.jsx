import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Eye,
  Filter,
  Landmark,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';

import AppShell from '../components/layout/AppShell';
import {
  listBankStatements,
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
  ['manual', 'Manual'],
];

const sortOptions = [
  ['latest_uploaded', 'Latest uploaded'],
  ['oldest_uploaded', 'Oldest uploaded'],
  ['newest_payment_date', 'Newest payment date'],
  ['oldest_payment_date', 'Oldest payment date'],
  ['amount_high_low', 'Amount high to low'],
  ['amount_low_high', 'Amount low to high'],
  ['variance_high_low', 'Variance high to low'],
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
    manual: 'Manual',
  };
  const styles = {
    reconciled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    partial_reconciled: 'border-amber-200 bg-amber-50 text-amber-700',
    unreconciled: 'border-rose-200 bg-rose-50 text-rose-700',
    manual: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={`inline-flex max-w-full whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${
        styles[status] ?? styles.unreconciled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function getStatementTone(statementId) {
  const tones = [
    {
      row: 'bg-cyan-50/70 hover:bg-cyan-100/70',
      rail: 'bg-cyan-500',
    },
    {
      row: 'bg-violet-50/70 hover:bg-violet-100/70',
      rail: 'bg-violet-500',
    },
    {
      row: 'bg-amber-50/70 hover:bg-amber-100/70',
      rail: 'bg-amber-500',
    },
    {
      row: 'bg-emerald-50/70 hover:bg-emerald-100/70',
      rail: 'bg-emerald-500',
    },
  ];
  const index = Math.abs(
    String(statementId)
      .split('')
      .reduce((total, char) => total + char.charCodeAt(0), 0),
  );

  return (
    tones[index % tones.length] ?? {
      row: 'bg-white hover:bg-cyan-50/80',
      rail: 'bg-slate-300',
    }
  );
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

function mapStatement(row) {
  return {
    id: row.id,
    label: row.document_name || `${row.bank_name || 'Bank'} statement`,
    bankName: row.bank_name || 'Unknown bank',
    accountNumber: row.account_number || '—',
    uploadedAt: row.created_at,
    transactionCount: row.transaction_count || row.number_of_txn || 0,
  };
}

function mapPayment(row, index) {
  const paymentAmount = toNumber(row.credit ?? row.amount);
  const matchedAmount = toNumber(row.matched_amount);
  return {
    id: row.id,
    statementId: row.statement,
    accountNumber: row.statement_account_number || '—',
    bankName: row.statement_bank_name || 'Unknown bank',
    paymentNumber: `PMT-${String(index + 1).padStart(4, '0')}`,
    referenceNumber: row.bank_reference_no || row.id.slice(0, 8),
    clientName: row.client_name || 'Unknown payer',
    description: row.description || '—',
    paymentDate: row.transaction_date,
    uploadedAt: row.statement_uploaded_at || row.created_at,
    paymentAmount,
    variance: Math.max(paymentAmount - matchedAmount, 0),
    status: row.status,
    ageing: getAgeing(row.transaction_date),
  };
}

function mapInvoiceCandidate(row) {
  const invoiceAmount = toNumber(row.total_amount);
  const matchedAmount = toNumber(row.matched_amount);
  const remainingAmount = Math.max(invoiceAmount - matchedAmount, 0);
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name || 'Unknown client',
    invoiceDate: row.invoice_date,
    invoiceAmount,
    remainingAmount,
    confidence: row.client_name ? 76 : 35,
  };
}

export default function PaymentsPage() {
  const pageSize = 12;
  const [allPayments, setAllPayments] = useState([]);
  const [statementBatches, setStatementBatches] = useState([
    {
      id: 'all',
      label: 'All statements',
      bankName: 'Every uploaded statement',
      accountNumber: 'All accounts',
      uploadedAt: '',
      transactionCount: 0,
    },
  ]);
  const [invoiceCandidates, setInvoiceCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('latest_uploaded');
  const [selectedStatementId, setSelectedStatementId] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [invoiceMatches, setInvoiceMatches] = useState([]);
  const [reconciliationMatches, setReconciliationMatches] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentsWorkspace() {
      setIsLoading(true);
      setLoadError('');
      try {
        const [
          statementsResponse,
          transactionsResponse,
          invoicesResponse,
          matchResponse,
        ] = await Promise.all([
          listBankStatements(),
          listBankTransactions(),
          listInvoices(),
          listReconciliationMatches(),
        ]);
        if (!isMounted) return;
        const statements = (statementsResponse.results ?? []).map(mapStatement);
        const transactions = (transactionsResponse.results ?? []).map(
          mapPayment,
        );
        setStatementBatches([
          {
            id: 'all',
            label: 'All statements',
            bankName: 'Every uploaded statement',
            accountNumber: 'All accounts',
            uploadedAt: '',
            transactionCount: transactions.length,
          },
          ...statements,
        ]);
        setAllPayments(transactions);
        setInvoiceCandidates(
          (invoicesResponse.results ?? [])
            .map(mapInvoiceCandidate)
            .filter((invoice) => invoice.remainingAmount > 0),
        );
        setReconciliationMatches(matchResponse.results ?? []);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error.message || 'Could not load payment data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPaymentsWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allPayments
      .filter((payment) => {
        const matchesStatement =
          selectedStatementId === 'all' ||
          payment.statementId === selectedStatementId;
        const matchesStatus = status === 'all' || payment.status === status;
        const matchesSearch =
          !normalizedQuery ||
          payment.accountNumber.toLowerCase().includes(normalizedQuery) ||
          payment.bankName.toLowerCase().includes(normalizedQuery) ||
          payment.paymentNumber.toLowerCase().includes(normalizedQuery) ||
          payment.referenceNumber.toLowerCase().includes(normalizedQuery) ||
          payment.clientName.toLowerCase().includes(normalizedQuery) ||
          payment.description.toLowerCase().includes(normalizedQuery) ||
          String(payment.paymentAmount).includes(normalizedQuery);

        return matchesStatement && matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        const uploadedLeft = new Date(left.uploadedAt);
        const uploadedRight = new Date(right.uploadedAt);
        const paymentDateLeft = new Date(left.paymentDate);
        const paymentDateRight = new Date(right.paymentDate);
        const sorters = {
          latest_uploaded: uploadedRight - uploadedLeft,
          oldest_uploaded: uploadedLeft - uploadedRight,
          newest_payment_date: paymentDateRight - paymentDateLeft,
          oldest_payment_date: paymentDateLeft - paymentDateRight,
          amount_high_low: right.paymentAmount - left.paymentAmount,
          amount_low_high: left.paymentAmount - right.paymentAmount,
          variance_high_low: Math.abs(right.variance) - Math.abs(left.variance),
        };

        return sorters[sortBy] ?? sorters.latest_uploaded;
      });
  }, [allPayments, query, selectedStatementId, sortBy, status]);

  const totalPages = Math.max(Math.ceil(filteredPayments.length / pageSize), 1);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageStart =
    filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredPayments.length);

  const activeFilterCount = [
    status !== 'all',
    selectedStatementId !== 'all',
  ].filter(Boolean).length;
  const totalPayments = allPayments.reduce(
    (total, payment) => total + payment.paymentAmount,
    0,
  );
  const reconciledPayments = allPayments
    .filter((payment) => payment.status === 'reconciled')
    .reduce((total, payment) => total + payment.paymentAmount, 0);
  const unreconciledPayments = allPayments
    .filter((payment) => payment.status === 'unreconciled')
    .reduce((total, payment) => total + payment.paymentAmount, 0);

  const kpis = [
    {
      label: 'Total Payments',
      value: currency(totalPayments),
      count: `${allPayments.length} payments`,
      Icon: Landmark,
      className: 'from-indigo-700 via-blue-700 to-cyan-600',
      chip: 'bg-white/20 text-cyan-50',
    },
    {
      label: 'Reconciled Payments',
      value: currency(reconciledPayments),
      count: `${allPayments.filter((payment) => payment.status === 'reconciled').length} payments`,
      Icon: CheckCircle2,
      className: 'from-emerald-700 via-teal-600 to-lime-500',
      chip: 'bg-white/20 text-emerald-50',
    },
    {
      label: 'Unreconciled Payments',
      value: currency(unreconciledPayments),
      count: `${allPayments.filter((payment) => payment.status === 'unreconciled').length} payments`,
      Icon: TrendingUp,
      className: 'from-rose-600 via-orange-500 to-amber-400',
      chip: 'bg-white/20 text-orange-50',
    },
  ];

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setSortBy('latest_uploaded');
    setSelectedStatementId('all');
    setCurrentPage(1);
  }

  function openPaymentDrawer(payment) {
    setActivePayment(payment);
    setSelectedInvoices({});
    setInvoiceQuery('');
  }

  function closePaymentDrawer() {
    setActivePayment(null);
    setSelectedInvoices({});
    setInvoiceQuery('');
  }

  const activePaymentStatement = activePayment
    ? statementBatches.find(
        (statement) => statement.id === activePayment.statementId,
      )
    : null;

  const matchedInvoices = useMemo(() => {
    if (!activePayment) return [];
    const persistedMatches = reconciliationMatches
      .filter((match) => match.bank_transaction === activePayment.id)
      .map((match) => ({
        id: match.invoice,
        matchId: match.id,
        invoiceNumber: match.invoice_number,
        clientName: match.client_name || 'Unknown client',
        invoiceDate: match.invoice_date,
        invoiceAmount: toNumber(match.invoice_amount),
        allocatedAmount: toNumber(match.allocated_amount),
        paymentId: activePayment.id,
        status: match.status_display || match.status,
      }));
    const localMatches = invoiceMatches.filter(
      (invoice) => invoice.paymentId === activePayment.id,
    );
    return [...persistedMatches, ...localMatches];
  }, [activePayment, invoiceMatches, reconciliationMatches]);

  const matchedInvoiceAmount = matchedInvoices.reduce(
    (total, invoice) => total + invoice.allocatedAmount,
    0,
  );
  const selectedInvoiceAmount = Object.values(selectedInvoices).reduce(
    (total, value) => total + value,
    0,
  );
  const paymentRemaining = activePayment
    ? Math.max(
        activePayment.paymentAmount -
          matchedInvoiceAmount -
          selectedInvoiceAmount,
        0,
      )
    : 0;
  const paymentOverAllocated = activePayment
    ? matchedInvoiceAmount + selectedInvoiceAmount > activePayment.paymentAmount
    : false;
  const isActivePaymentReconciled = activePayment
    ? matchedInvoiceAmount >= activePayment.paymentAmount
    : false;
  const selectedInvoiceCount = Object.keys(selectedInvoices).length;
  const hasSelectedInvoiceAllocation = Object.values(selectedInvoices).some(
    (value) => value > 0,
  );
  const drawerReconciliationState = activePayment
    ? isActivePaymentReconciled
      ? 'Fully reconciled'
      : matchedInvoices.length > 0
        ? 'Partially reconciled'
        : 'Unreconciled'
    : '';
  const drawerStateTone = isActivePaymentReconciled
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : matchedInvoices.length > 0
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';

  const drawerInvoiceCandidates = useMemo(() => {
    if (!activePayment) return [];
    const normalized = invoiceQuery.trim().toLowerCase();
    return invoiceCandidates.filter((invoice) => {
      const alreadyMatchedToPayment = matchedInvoices.some(
        (match) => match.id === invoice.id,
      );
      const alreadyMatchedAnywhere = reconciliationMatches.some(
        (match) => match.invoice === invoice.id,
      );
      const matchesClient =
        invoice.clientName === activePayment.clientName ||
        activePayment.status !== 'reconciled';
      const matchesSearch =
        !normalized ||
        invoice.invoiceNumber.toLowerCase().includes(normalized) ||
        invoice.clientName.toLowerCase().includes(normalized) ||
        String(invoice.invoiceAmount).includes(normalized);

      return (
        !alreadyMatchedToPayment &&
        !alreadyMatchedAnywhere &&
        matchesClient &&
        matchesSearch
      );
    });
  }, [
    activePayment,
    invoiceCandidates,
    invoiceQuery,
    matchedInvoices,
    reconciliationMatches,
  ]);

  function toggleInvoice(invoice) {
    setSelectedInvoices((current) => {
      if (current[invoice.id] !== undefined) {
        const next = { ...current };
        delete next[invoice.id];
        return next;
      }

      const currentSelectedAmount = Object.values(current).reduce(
        (total, value) => total + value,
        0,
      );
      const availablePaymentAmount = activePayment
        ? activePayment.paymentAmount -
          matchedInvoiceAmount -
          currentSelectedAmount
        : invoice.remainingAmount;

      return {
        ...current,
        [invoice.id]: Math.min(
          invoice.remainingAmount,
          Math.max(availablePaymentAmount, 0),
        ),
      };
    });
  }

  function updateInvoiceAllocation(invoice, value) {
    const parsedValue = Number(value);
    const safeValue = Number.isNaN(parsedValue)
      ? 0
      : Math.min(Math.max(parsedValue, 0), invoice.remainingAmount);

    setSelectedInvoices((current) => ({
      ...current,
      [invoice.id]: safeValue,
    }));
  }

  async function removeMatchedInvoice(invoice) {
    if (invoice.matchId) {
      try {
        await unmatchReconciliation(invoice.matchId);
        setReconciliationMatches((current) =>
          current.filter((match) => match.id !== invoice.matchId),
        );
        setInvoiceCandidates((current) => {
          if (current.some((candidate) => candidate.id === invoice.id)) {
            return current;
          }
          return [
            ...current,
            {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              invoiceDate: invoice.invoiceDate,
              invoiceAmount: invoice.invoiceAmount,
              remainingAmount: invoice.allocatedAmount,
              confidence: 76,
            },
          ];
        });
      } catch (error) {
        setLoadError(error.message || 'Could not remove this match.');
      }
      return;
    }

    setInvoiceMatches((current) =>
      current.filter(
        (match) =>
          !(
            activePayment &&
            match.paymentId === activePayment.id &&
            match.id === invoice.id
          ),
      ),
    );
  }

  function confirmInvoiceMatch() {
    if (
      !activePayment ||
      selectedInvoiceCount === 0 ||
      !hasSelectedInvoiceAllocation ||
      paymentOverAllocated
    ) {
      return;
    }

    const newMatches = Object.entries(selectedInvoices)
      .filter(([, amount]) => amount > 0)
      .map(([invoiceId, amount]) => {
        const invoice = invoiceCandidates.find(
          (candidate) => candidate.id === invoiceId,
        );
        return {
          ...invoice,
          allocatedAmount: amount,
          paymentId: activePayment.id,
          status:
            amount >= invoice.remainingAmount ? 'Matched' : 'Partially matched',
        };
      })
      .filter(Boolean);

    setInvoiceMatches((current) => [...current, ...newMatches]);
    setSelectedInvoices({});
  }

  return (
    <AppShell
      eyebrow="Payments"
      title="Payment Register"
      subtitle="Parsed bank-statement transactions grouped by uploaded statement"
    >
      <section className="px-5 py-5">
        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError}
          </div>
        )}
        {isLoading && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            Loading parsed bank statements and transactions...
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
          {kpis.map((kpi) => (
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${kpi.className}`}
              key={kpi.label}
            >
              <div className="absolute -right-8 -top-10 h-32 w-32 rotate-12 rounded-[2rem] border border-white/20 bg-white/10" />
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
          <div className="sticky top-[5rem] z-20 rounded-t-2xl border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_52%,#fff7ed_100%)] px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-cyan-200 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Parsed Payment Ledger
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {filteredPayments.length} of {allPayments.length} records
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <select
                  className="h-10 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 lg:w-60"
                  value={selectedStatementId}
                  onChange={(event) => {
                    setSelectedStatementId(event.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {statementBatches.map((statement) => (
                    <option key={statement.id} value={statement.id}>
                      {statement.label}
                    </option>
                  ))}
                </select>
                <label className="relative min-w-0 lg:w-[30rem]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Search payment, ref, client, bank or description"
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
                    Filter payments
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
                  <select
                    className="h-10 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                    value={selectedStatementId}
                    onChange={(event) => {
                      setSelectedStatementId(event.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {statementBatches.map((statement) => (
                      <option key={statement.id} value={statement.id}>
                        {statement.label}
                      </option>
                    ))}
                  </select>
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
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[21%]" />
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[5%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="px-2 py-3">Account number</th>
                    <th className="px-2 py-3">Bank name</th>
                    <th className="px-2 py-3">Payment #</th>
                    <th className="px-2 py-3">Ref #</th>
                    <th className="px-2 py-3">Client Name</th>
                    <th className="px-2 py-3">Description</th>
                    <th className="px-2 py-3">Payment date</th>
                    <th className="px-2 py-3">Payment amount</th>
                    <th className="px-2 py-3">Variance</th>
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
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[21%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="sr-only">
                <tr>
                  <th className="px-2 py-3">Account number</th>
                  <th className="px-2 py-3">Bank name</th>
                  <th className="px-2 py-3">Payment #</th>
                  <th className="px-2 py-3">Ref #</th>
                  <th className="px-2 py-3">Client Name</th>
                  <th className="px-2 py-3">Description</th>
                  <th className="px-2 py-3">Payment date</th>
                  <th className="px-2 py-3">Payment amount</th>
                  <th className="px-2 py-3">Variance</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Ageing</th>
                  <th className="px-2 py-3">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedPayments.map((payment) => {
                  const tone = getStatementTone(payment.statementId);

                  return (
                    <tr
                      className={`align-top transition ${tone.row}`}
                      key={payment.id}
                    >
                      <td className="relative px-2 py-3 font-semibold leading-snug text-slate-950">
                        <span
                          className={`absolute bottom-0 left-0 top-0 w-1 ${tone.rail}`}
                        />
                        <div className="break-words pl-2">
                          <p>{payment.accountNumber}</p>
                        </div>
                      </td>
                      <td className="break-words px-2 py-3 leading-snug text-slate-700">
                        {payment.bankName}
                      </td>
                      <td className="break-words px-2 py-3 font-semibold leading-snug text-slate-950">
                        {payment.paymentNumber}
                      </td>
                      <td className="break-words px-2 py-3 leading-snug text-slate-700">
                        {payment.referenceNumber}
                      </td>
                      <td className="break-words px-2 py-3 leading-snug text-slate-700">
                        {payment.clientName}
                      </td>
                      <td className="break-words px-2 py-3 font-medium leading-snug text-slate-600">
                        {payment.description}
                      </td>
                      <td className="break-words px-2 py-3 leading-snug text-slate-600">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="break-words px-2 py-3 font-semibold leading-snug text-slate-950">
                        {currency(payment.paymentAmount)}
                      </td>
                      <td
                        className={`break-words px-2 py-3 font-semibold leading-snug ${
                          payment.variance === 0
                            ? 'text-emerald-700'
                            : payment.variance < 0
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {currency(payment.variance)}
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            payment.status === 'reconciled'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                          }`}
                        >
                          {payment.ageing}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <button
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800"
                          type="button"
                          onClick={() => openPaymentDrawer(payment)}
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPayments.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {pageStart}-{pageEnd} of {filteredPayments.length}{' '}
                payments
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

          {filteredPayments.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-950">
                No payments match these filters.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try clearing search, statement batch or status filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {activePayment && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close payment details"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px]"
            type="button"
            onClick={closePaymentDrawer}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_32%),linear-gradient(135deg,#ffffff,#f1f7ff_52%,#fff7ed)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Payment transaction detail
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {activePayment.paymentNumber}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {activePayment.clientName} ·{' '}
                    {new Date(activePayment.paymentDate).toLocaleDateString()}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${drawerStateTone}`}
                  >
                    {drawerReconciliationState}
                  </span>
                </div>
                <button
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  type="button"
                  onClick={closePaymentDrawer}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  [
                    'Payment Amount',
                    currency(activePayment.paymentAmount),
                    'text-slate-950',
                  ],
                  [
                    'Allocated',
                    currency(matchedInvoiceAmount + selectedInvoiceAmount),
                    matchedInvoiceAmount + selectedInvoiceAmount > 0
                      ? 'text-emerald-700'
                      : 'text-slate-500',
                  ],
                  [
                    'Remaining',
                    currency(paymentRemaining),
                    paymentOverAllocated ? 'text-rose-700' : 'text-orange-700',
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
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Matched invoices
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {matchedInvoices.length} linked
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {matchedInvoices.length === 0
                    ? 'This payment has not been connected to any invoice yet.'
                    : matchedInvoices.length === 1
                      ? 'This payment is currently connected to one invoice.'
                      : 'This payment is split across multiple invoices.'}
                  {!isActivePaymentReconciled &&
                    ` ${currency(paymentRemaining)} is still available to map manually.`}
                </p>
                <div className="mt-3 space-y-2">
                  {matchedInvoices.map((invoice) => (
                    <div
                      className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-[1fr_auto_auto]"
                      key={`${invoice.paymentId}-${invoice.id}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-slate-500">
                          {invoice.clientName} ·{' '}
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </p>
                        <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">
                          {currency(invoice.allocatedAmount)}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          of {currency(invoice.invoiceAmount)}
                        </p>
                      </div>
                      <button
                        aria-label={`Unmatch ${invoice.invoiceNumber}`}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-50 hover:text-rose-700"
                        type="button"
                        onClick={() => removeMatchedInvoice(invoice)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {matchedInvoices.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-500">
                      No invoices linked to this payment yet.
                    </p>
                  )}
                </div>
              </section>

              {!isActivePaymentReconciled && (
                <section className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Map remaining balance
                    </h3>
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                      {currency(paymentRemaining)} open
                    </span>
                  </div>
                  <label className="relative mt-3 block">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm font-medium ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Search invoice number, client or amount"
                      value={invoiceQuery}
                      onChange={(event) => setInvoiceQuery(event.target.value)}
                    />
                  </label>
                  <div className="mt-3 space-y-2">
                    {drawerInvoiceCandidates.map((invoice) => {
                      const selected =
                        selectedInvoices[invoice.id] !== undefined;
                      return (
                        <div
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selected
                              ? 'border-cyan-300 bg-cyan-50'
                              : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                          }`}
                          key={invoice.id}
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
                                onClick={() => toggleInvoice(invoice)}
                              >
                                {selected ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <Circle size={10} />
                                )}
                              </button>
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {invoice.invoiceNumber}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {invoice.clientName} ·{' '}
                                  {new Date(
                                    invoice.invoiceDate,
                                  ).toLocaleDateString()}
                                </p>
                                <span className="mt-2 inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                                  {invoice.confidence}% confidence
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-950">
                                {currency(invoice.remainingAmount)}
                              </p>
                              <p className="text-xs font-medium text-slate-500">
                                remaining
                              </p>
                            </div>
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
                                  max={invoice.remainingAmount}
                                  step="0.01"
                                  type="number"
                                  value={selectedInvoices[invoice.id]}
                                  onChange={(event) =>
                                    updateInvoiceAllocation(
                                      invoice,
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
                    {drawerInvoiceCandidates.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                        No candidate invoices match this search.
                      </p>
                    )}
                  </div>
                </section>
              )}

              <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Source statement
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {activePaymentStatement?.label} · {activePayment.bankName} ·{' '}
                  {activePayment.accountNumber} · uploaded{' '}
                  {new Date(activePayment.uploadedAt).toLocaleString()}
                </p>
              </section>
            </div>

            {!isActivePaymentReconciled && (
              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Selected: {currency(selectedInvoiceAmount)}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Remaining payment balance: {currency(paymentRemaining)}
                    </p>
                    {paymentOverAllocated && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        Selected invoices exceed the payment amount. Review
                        before confirming.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                      type="button"
                      onClick={() => setSelectedInvoices({})}
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        selectedInvoiceCount === 0 ||
                        !hasSelectedInvoiceAllocation ||
                        paymentOverAllocated
                      }
                      type="button"
                      onClick={confirmInvoiceMatch}
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
