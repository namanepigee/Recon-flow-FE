import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Mail,
  ReceiptText,
  Upload,
} from 'lucide-react';

import * as documentsApi from '../api/documents';
import { ApiError } from '../api/client';
import ButtonSpinner from '../components/common/ButtonSpinner';
import AppShell from '../components/layout/AppShell';

const ACCEPTED_TYPES = [
  '.pdf',
  '.csv',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
].join(',');

const documentTypes = [
  {
    value: 'invoice',
    label: 'Invoice',
    description: 'Supplier invoices, credit notes, scans or ledgers',
    Icon: ReceiptText,
  },
  {
    value: 'bank_statement',
    label: 'Bank statement',
    description: 'Statement exports, PDFs, CSVs, Excel files or images',
    Icon: Banknote,
  },
];

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value) || 0);
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function documentLabel(value) {
  return (
    {
      invoice: 'Invoice',
      bank_statement: 'Bank statement',
    }[value] ?? value
  );
}

function sumRows(rows, fields) {
  return rows.reduce((total, row) => {
    const value = fields.reduce(
      (selected, field) => selected ?? row[field],
      null,
    );
    return total + Number(value || 0);
  }, 0);
}

function statusRows(rows, status) {
  return rows.filter((row) => row.status === status);
}

export default function DashboardPage() {
  const inputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [advices, setAdvices] = useState([]);
  const [documentType, setDocumentType] = useState('invoice');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState('');

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        documentResponse,
        invoiceResponse,
        paymentResponse,
        adviceResponse,
      ] = await Promise.all([
        documentsApi.listDocuments(),
        documentsApi.listInvoices(),
        documentsApi.listBankTransactions(),
        documentsApi.listPaymentAdvices(),
      ]);
      setDocuments(documentResponse.results ?? []);
      setInvoices(invoiceResponse.results ?? []);
      setPayments(paymentResponse.results ?? []);
      setAdvices(adviceResponse.results ?? []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load the reconciliation workspace.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const selectedType = documentTypes.find(
    (type) => type.value === documentType,
  );

  const kpis = useMemo(() => {
    const openInvoices = invoices.filter((row) => row.status !== 'reconciled');
    const openPayments = payments.filter((row) => row.status !== 'reconciled');
    const openAdvices = advices.filter((row) => row.status !== 'reconciled');

    return [
      {
        label: 'Invoices parsed',
        value: invoices.length,
        count: currency(sumRows(invoices, ['total_amount'])),
        Icon: ReceiptText,
        className: 'from-indigo-700 via-blue-700 to-cyan-600',
      },
      {
        label: 'Invoices reconciled',
        value: statusRows(invoices, 'reconciled').length,
        count: `${openInvoices.length} open`,
        Icon: CheckCircle2,
        className: 'from-emerald-700 via-teal-600 to-lime-500',
      },
      {
        label: 'Payments parsed',
        value: payments.length,
        count: currency(sumRows(payments, ['credit', 'amount'])),
        Icon: Banknote,
        className: 'from-blue-700 via-cyan-700 to-teal-600',
      },
      {
        label: 'Payment exceptions',
        value: openPayments.length,
        count: 'need review',
        Icon: AlertTriangle,
        className: 'from-rose-600 via-orange-500 to-amber-400',
      },
      {
        label: 'Advice queue',
        value: advices.length,
        count: `${openAdvices.length} pending`,
        Icon: Mail,
        className: 'from-violet-700 via-indigo-700 to-blue-600',
      },
    ];
  }, [advices, invoices, payments]);

  function addFiles(fileList) {
    setSelectedFiles(Array.from(fileList ?? []));
  }

  async function upload() {
    if (!selectedFiles.length) {
      inputRef.current?.click();
      return;
    }

    setUploadingType(documentType);
    setUploadingCount(selectedFiles.length);
    setError('');
    try {
      const data = await documentsApi.uploadDocuments({
        documentType,
        files: selectedFiles,
      });
      setDocuments((current) => [...(data.documents ?? []), ...current]);
      await loadWorkspace();
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Upload failed. Please try again.',
      );
    } finally {
      setUploadingType('');
      setUploadingCount(0);
    }
  }

  return (
    <AppShell
      eyebrow="Home"
      title="Financial Reconciliation Workspace"
      subtitle="Upload documents and monitor intake readiness"
      processingStatus={
        uploadingType
          ? {
              type: uploadingType,
              count: uploadingCount,
            }
          : null
      }
    >
      <section className="px-5 py-5">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertTriangle className="shrink-0" size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-sm ${kpi.className}`}
              key={kpi.label}
            >
              <div className="absolute -right-9 -top-12 h-28 w-28 rotate-12 rounded-[2rem] border border-white/15 bg-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {kpi.value}
                  </p>
                  <span className="mt-2 inline-flex rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white">
                    {kpi.count}
                  </span>
                </div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <kpi.Icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Upload files
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Pick what the files contain, then upload one or many files.
                </p>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-cyan-200">
                <Upload size={20} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {documentTypes.map((type) => (
                <button
                  className={`rounded-xl border p-4 text-left transition ${
                    documentType === type.value
                      ? 'border-blue-300 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                  key={type.value}
                  type="button"
                  onClick={() => setDocumentType(type.value)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${
                        documentType === type.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <type.Icon size={18} />
                    </span>
                    <span className="font-semibold text-slate-950">
                      {type.label}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>

            <div
              className={`mt-5 rounded-xl border border-dashed p-6 text-center transition ${
                isDragging
                  ? 'border-blue-400 bg-blue-50 ring-4 ring-blue-100'
                  : 'border-slate-300 bg-slate-50'
              }`}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <button
                className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <FileSpreadsheet size={21} />
              </button>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                Drop {selectedType?.label.toLowerCase()} files here or browse
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                PDF, Excel, CSV and images. Multiple files supported.
              </p>
              <input
                ref={inputRef}
                accept={ACCEPTED_TYPES}
                className="sr-only"
                multiple
                type="file"
                onChange={(event) => addFiles(event.target.files)}
              />
            </div>

            <div className="mt-4 min-h-12">
              {selectedFiles.length ? (
                <div className="space-y-2">
                  {selectedFiles.slice(0, 4).map((file) => (
                    <div
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
                      key={`${file.name}-${file.size}`}
                    >
                      <span className="min-w-0 truncate font-semibold text-slate-700">
                        {file.name}
                      </span>
                      <span className="ml-3 shrink-0 text-xs text-slate-500">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length > 4 && (
                    <p className="text-xs font-semibold text-slate-500">
                      +{selectedFiles.length - 4} more files selected
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                  No files selected.
                </p>
              )}
            </div>

            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={Boolean(uploadingType)}
              type="button"
              onClick={upload}
            >
              {uploadingType && <ButtonSpinner />}
              {selectedFiles.length
                ? `Upload ${selectedFiles.length} ${selectedType?.label.toLowerCase()} file${
                    selectedFiles.length > 1 ? 's' : ''
                  }`
                : `Choose ${selectedType?.label.toLowerCase()} files`}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_55%,#f7fff7_100%)] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-cyan-200">
                  <Clock3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Recently uploaded files
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {documents.length} documents in workspace
                  </p>
                </div>
              </div>
              <button
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                type="button"
                onClick={loadWorkspace}
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-sm font-semibold text-slate-500">
                Loading workspace...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto text-slate-300" size={36} />
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  No uploads yet
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Upload an invoice or bank statement to start extraction.
                </p>
              </div>
            ) : (
              <div className="overflow-x-hidden">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[38%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">File</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Uploaded</th>
                      <th className="px-3 py-3">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {documents.slice(0, 8).map((item) => {
                      const isReady = ['parsed', 'extracted'].includes(
                        item.status,
                      );
                      return (
                        <tr
                          className="transition hover:bg-cyan-50/60"
                          key={item.id}
                        >
                          <td className="px-4 py-3">
                            <p className="truncate font-semibold text-slate-950">
                              {item.original_filename}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {item.document_type_display ||
                              documentLabel(item.document_type)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ${
                                isReady
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                  : 'bg-rose-50 text-rose-700 ring-rose-100'
                              }`}
                            >
                              {isReady ? (
                                <BadgeCheck size={13} />
                              ) : (
                                <AlertTriangle size={13} />
                              )}
                              {item.status_display || item.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            {formatBytes(item.file_size)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
