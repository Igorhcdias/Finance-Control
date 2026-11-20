import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { Modal } from './Modal';
import type {
  Category,
  CsvColumnMapping,
  CsvImportResponse,
  CsvPreviewResponse,
  CsvSourceType,
  PaymentMethod,
  TransactionType,
} from '../types';
import type { CategoryInput } from '../services/category.service';
import { transactionService, type TransactionInput } from '../services/transaction.service';
import { getApiErrorMessage } from '../services/api';
import { categoryNameSchema } from '../schemas/category.schema';
import { formatCurrency, formatDate } from '../utils/format';
import { buildCsvTemplate, decodeCsvBytes, summarizeSelectedRows, validateCsvFile } from '../utils/csv';

type PreviewTypeFilter = 'ALL' | TransactionType;

interface EditableCsvRow {
  rowKey: string;
  lineNumber: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod | '';
  suggestedCategoryName: string | null;
  categoryId: string;
  categoryEditedManually: boolean;
  isDuplicate: boolean;
  selected: boolean;
}

interface CsvImportModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onCreateCategory: (input: CategoryInput) => Promise<Category>;
  onImported: (result: CsvImportResponse, importedDates: string[]) => Promise<void> | void;
}

const EMPTY_MAPPING: CsvColumnMapping = {
  date: null,
  description: null,
  amount: null,
  incomeAmount: null,
  expenseAmount: null,
  type: null,
  category: null,
  paymentMethod: null,
};

const MAPPING_FIELD_LABELS: Array<{ key: keyof CsvColumnMapping; label: string; required?: boolean }> = [
  { key: 'date', label: 'Data *', required: true },
  { key: 'description', label: 'Descrição *', required: true },
  { key: 'amount', label: 'Valor único' },
  { key: 'incomeAmount', label: 'Coluna Entrada' },
  { key: 'expenseAmount', label: 'Coluna Saída' },
  { key: 'type', label: 'Tipo (Entrada/Saída)' },
  { key: 'category', label: 'Categoria' },
  { key: 'paymentMethod', label: 'Forma de pagamento' },
];

function formatDelimiterLabel(delimiter: string): string {
  if (delimiter === ';') return 'ponto e vírgula (;)';
  if (delimiter === ',') return 'vírgula (,)';
  if (delimiter === '\t') return 'tabulação (TAB)';
  return delimiter;
}

export function CsvImportModal({
  isOpen,
  categories,
  onClose,
  onCreateCategory,
  onImported,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreatingCategoryRef = useRef(false);

  const [sourceType, setSourceType] = useState<CsvSourceType>('STATEMENT');
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
  const [rows, setRows] = useState<EditableCsvRow[]>([]);
  const [mappingDraft, setMappingDraft] = useState<CsvColumnMapping>(EMPTY_MAPPING);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [showErrorsList, setShowErrorsList] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PreviewTypeFilter>('ALL');

  const [defaultIncomeCategoryId, setDefaultIncomeCategoryId] = useState('');
  const [defaultExpenseCategoryId, setDefaultExpenseCategoryId] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryError, setQuickCategoryError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const firstCat = categories[0]?.id ?? '';
    setSourceType('STATEMENT');
    setFileName('');
    setCsvContent('');
    setPreview(null);
    setRows([]);
    setMappingDraft(EMPTY_MAPPING);
    setShowColumnMapping(false);
    setShowErrorsList(false);
    setTypeFilter('ALL');
    setDefaultIncomeCategoryId(firstCat);
    setDefaultExpenseCategoryId(firstCat);
    setIsAnalyzing(false);
    setIsImporting(false);
    setIsDragging(false);
    setErrorMessage('');
    setIsQuickCreateOpen(false);
    setQuickCategoryName('');
    setQuickCategoryError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || categories.length === 0) return;
    const firstCat = categories[0].id;
    setDefaultIncomeCategoryId((current) => current || firstCat);
    setDefaultExpenseCategoryId((current) => current || firstCat);
  }, [isOpen, categories]);

  const summary = useMemo(() => summarizeSelectedRows(rows), [rows]);

  const countsByType = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.type === 'INCOME') income += 1;
      else expense += 1;
    }
    return { all: rows.length, income, expense };
  }, [rows]);

  const visibleRows = useMemo(
    () => (typeFilter === 'ALL' ? rows : rows.filter((row) => row.type === typeFilter)),
    [rows, typeFilter],
  );

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => row.selected);

  async function runPreview(
    content: string,
    targetSourceType: CsvSourceType,
    columnMapping?: CsvColumnMapping,
    incomeFallback = defaultIncomeCategoryId || categories[0]?.id || '',
    expenseFallback = defaultExpenseCategoryId || categories[0]?.id || '',
  ) {
    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const response = await transactionService.previewCsv({
        csvContent: content,
        sourceType: targetSourceType,
        columnMapping,
      });
      setPreview(response);
      setMappingDraft(response.detectedMapping);
      setShowColumnMapping(response.rows.length === 0 && response.headers.length > 0);
      setShowErrorsList(false);
      setTypeFilter('ALL');
      setRows(
        response.rows.map((row, index) => {
          const fallbackCategory = row.type === 'INCOME' ? incomeFallback : expenseFallback;
          return {
            rowKey: `${row.lineNumber}-${index}`,
            lineNumber: row.lineNumber,
            date: row.date,
            description: row.description,
            amount: row.amount,
            type: row.type,
            paymentMethod: row.type === 'EXPENSE' ? (row.paymentMethod ?? '') : '',
            suggestedCategoryName: row.suggestedCategoryName,
            categoryId: row.categoryId ?? fallbackCategory,
            categoryEditedManually: Boolean(row.categoryId),
            isDuplicate: row.isDuplicate,
            selected: !row.isDuplicate,
          };
        }),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Não foi possível processar o arquivo CSV.'));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function processFile(file: File) {
    const validationError = validateCsvFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage('');
    try {
      const buffer = await file.arrayBuffer();
      const decoded = decodeCsvBytes(buffer);
      setFileName(file.name);
      setCsvContent(decoded);
      await runPreview(decoded, sourceType);
    } catch {
      setErrorMessage('Não foi possível ler o arquivo selecionado.');
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void processFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  function handleDownloadTemplate() {
    const content = buildCsvTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-lancamentos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleSourceTypeChange(nextType: CsvSourceType) {
    if (nextType === sourceType || isAnalyzing || isImporting) return;
    setSourceType(nextType);
    if (preview && csvContent) {
      void runPreview(csvContent, nextType);
    }
  }

  function handleReprocessWithMapping() {
    if (!csvContent) return;
    if (!mappingDraft.date || !mappingDraft.description || (!mappingDraft.amount && !mappingDraft.incomeAmount && !mappingDraft.expenseAmount)) {
      setErrorMessage('Mapeie Data, Descrição e Valor (ou Entrada/Saída) para reprocessar o arquivo.');
      return;
    }
    void runPreview(csvContent, sourceType, mappingDraft);
  }

  function handleDefaultCategoryChange(targetType: TransactionType, nextCategoryId: string) {
    if (targetType === 'INCOME') setDefaultIncomeCategoryId(nextCategoryId);
    else setDefaultExpenseCategoryId(nextCategoryId);

    setRows((current) =>
      current.map((row) => {
        if (row.type === targetType && !row.categoryEditedManually) {
          return { ...row, categoryId: nextCategoryId };
        }
        return row;
      }),
    );
  }

  function toggleRowSelection(rowKey: string) {
    setRows((current) =>
      current.map((row) => (row.rowKey === rowKey ? { ...row, selected: !row.selected } : row)),
    );
  }

  function toggleSelectAllVisible() {
    const nextValue = !allVisibleSelected;
    const visibleKeys = new Set(visibleRows.map((row) => row.rowKey));
    setRows((current) =>
      current.map((row) => (visibleKeys.has(row.rowKey) ? { ...row, selected: nextValue } : row)),
    );
  }

  function flipRowType(row: EditableCsvRow): EditableCsvRow {
    const nextType: TransactionType = row.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
    const nextPayment: PaymentMethod | '' = nextType === 'EXPENSE'
      ? (row.paymentMethod || (sourceType === 'INVOICE' ? 'CREDIT' : 'DEBIT'))
      : '';
    let nextCategoryId = row.categoryId;
    if (!row.categoryEditedManually) {
      nextCategoryId = nextType === 'INCOME' ? defaultIncomeCategoryId : defaultExpenseCategoryId;
    }
    return {
      ...row,
      type: nextType,
      paymentMethod: nextPayment,
      categoryId: nextCategoryId,
    };
  }

  function handleToggleRowType(rowKey: string) {
    setRows((current) => current.map((row) => (row.rowKey === rowKey ? flipRowType(row) : row)));
  }

  function handleInvertAllTypes() {
    setRows((current) => current.map(flipRowType));
  }

  function handleRowCategoryChange(rowKey: string, categoryId: string) {
    setRows((current) =>
      current.map((row) =>
        row.rowKey === rowKey ? { ...row, categoryId, categoryEditedManually: true } : row,
      ),
    );
  }

  function handleRowPaymentChange(rowKey: string, paymentMethod: PaymentMethod | '') {
    setRows((current) =>
      current.map((row) => (row.rowKey === rowKey ? { ...row, paymentMethod } : row)),
    );
  }

  function resetToFileSelection() {
    setPreview(null);
    setRows([]);
    setCsvContent('');
    setFileName('');
    setErrorMessage('');
    setShowColumnMapping(false);
    setShowErrorsList(false);
  }

  async function saveQuickCategory() {
    if (isCreatingCategoryRef.current) return;
    const parsedName = categoryNameSchema.safeParse(quickCategoryName);
    if (!parsedName.success) {
      setQuickCategoryError(parsedName.error.issues[0]?.message ?? 'Informe um nome válido.');
      return;
    }

    isCreatingCategoryRef.current = true;
    setIsCreatingCategory(true);
    setQuickCategoryError('');
    try {
      const created = await onCreateCategory({
        name: parsedName.data,
        color: '#2563eb',
        budgetLimit: null,
      });
      setDefaultIncomeCategoryId((current) => current || created.id);
      setDefaultExpenseCategoryId((current) => current || created.id);
      setRows((current) =>
        current.map((row) => (row.categoryId ? row : { ...row, categoryId: created.id })),
      );
      setQuickCategoryName('');
      setIsQuickCreateOpen(false);
    } catch (error) {
      setQuickCategoryError(getApiErrorMessage(error, 'Não foi possível cadastrar a categoria.'));
    } finally {
      isCreatingCategoryRef.current = false;
      setIsCreatingCategory(false);
    }
  }

  function handleQuickCategoryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void saveQuickCategory();
    }
  }

  async function handleConfirmImport() {
    const selectedRows = rows.filter((row) => row.selected);
    if (selectedRows.length === 0) {
      setErrorMessage('Selecione ao menos um lançamento para importar.');
      return;
    }
    if (summary.missingCategoryCount > 0) {
      setErrorMessage('Defina uma categoria para todos os lançamentos selecionados.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    try {
      const items: TransactionInput[] = selectedRows.map((row) => {
        const payload: TransactionInput = {
          description: row.description,
          amount: row.amount,
          type: row.type,
          date: row.date,
          categoryId: row.categoryId,
        };
        if (row.type === 'EXPENSE' && row.paymentMethod) {
          payload.paymentMethod = row.paymentMethod;
        }
        return payload;
      });
      const result = await transactionService.importTransactions(items);
      await onImported(
        result,
        selectedRows.map((row) => row.date),
      );
      onClose();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Não foi possível importar os lançamentos.'));
    } finally {
      setIsImporting(false);
    }
  }

  const isBusy = isAnalyzing || isImporting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar extrato ou fatura (CSV)"
      accessible
      dismissible={!isBusy}
      maxWidthClassName="max-w-5xl"
    >
      {!preview ? (
        <div className="space-y-5">
          <div>
            <span className="label-field">Tipo de documento</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de documento CSV">
              {([
                {
                  id: 'STATEMENT',
                  title: 'Extrato bancário (Conta / Débito)',
                  description: 'Valores positivos entram como Receita; negativos como Despesa no débito.',
                },
                {
                  id: 'INVOICE',
                  title: 'Fatura de cartão de crédito',
                  description: 'Valores positivos entram como Despesa no crédito; negativos como estorno/Entrada.',
                },
              ] as const).map((option) => {
                const active = sourceType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isBusy}
                    onClick={() => handleSourceTypeChange(option.id)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-100'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{option.title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!isBusy) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging ? 'border-primary-500 bg-primary-50/50' : 'border-gray-300 bg-gray-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileInputChange}
              className="sr-only"
              aria-label="Selecionar arquivo CSV"
            />
            <FileSpreadsheet size={34} className="mx-auto text-primary-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-gray-900">
              {isAnalyzing ? 'Analisando arquivo CSV...' : 'Arraste seu arquivo .csv aqui ou clique para selecionar'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Aceita arquivos .csv até 2 MB (máximo 1.000 lançamentos), separador vírgula, ponto e vírgula ou TAB.
            </p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary mt-4 min-h-11"
            >
              <Upload size={16} /> {isAnalyzing ? 'Processando...' : 'Selecionar arquivo CSV'}
            </button>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3.5 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-gray-600">
              O sistema separa automaticamente <strong>Entradas</strong> e <strong>Saídas</strong> por colunas divididas, coluna Tipo ou sinal do valor, e ignora linhas de saldo.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn-secondary min-h-11 shrink-0 text-xs"
            >
              <Download size={15} /> Baixar modelo CSV
            </button>
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} disabled={isBusy} className="btn-secondary min-h-11">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{fileName}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                Delimitador detectado: <strong>{formatDelimiterLabel(preview.detectedDelimiter)}</strong>
                {' · '}
                {preview.summary.totalRows} {preview.summary.totalRows === 1 ? 'lançamento válido' : 'lançamentos válidos'}
                {preview.summary.duplicateCount > 0 && ` · ${preview.summary.duplicateCount} possível(is) duplicado(s)`}
                {preview.summary.errorCount > 0 && ` · ${preview.summary.errorCount} linha(s) ignorada(s)`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-gray-200/80 p-0.5" role="group" aria-label="Modo de interpretação">
                {([
                  ['STATEMENT', 'Extrato'],
                  ['INVOICE', 'Fatura'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSourceTypeChange(value)}
                    className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
                      sourceType === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={resetToFileSelection}
                className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
              >
                Trocar arquivo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <ArrowUpCircle size={16} aria-hidden="true" />
                Entradas selecionadas ({summary.incomeCount})
              </div>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{formatCurrency(summary.incomeTotal)}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-red-800">
                <ArrowDownCircle size={16} aria-hidden="true" />
                Saídas selecionadas ({summary.expenseCount})
              </div>
              <p className="mt-1 text-lg font-semibold text-red-600">{formatCurrency(summary.expenseTotal)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3.5">
              <p className="text-xs font-medium text-gray-600">Lançamentos a importar</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {summary.selectedCount} <span className="text-sm font-normal text-gray-500">de {rows.length}</span>
              </p>
              {summary.missingCategoryCount > 0 && (
                <p className="mt-0.5 text-xs text-amber-700">
                  {summary.missingCategoryCount} selecionado(s) sem categoria
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setShowColumnMapping((open) => !open)}
              aria-expanded={showColumnMapping}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={16} aria-hidden="true" />
                Ajustar mapeamento de colunas
              </span>
              <span className="text-xs text-gray-500">{showColumnMapping ? 'Ocultar' : 'Exibir'}</span>
            </button>

            {showColumnMapping && (
              <div className="space-y-3 border-t border-gray-200 bg-gray-50/70 p-3.5">
                <p className="text-xs text-gray-600">
                  Mapeie <strong>Valor único</strong> ou as colunas separadas <strong>Entrada</strong> e <strong>Saída</strong>.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {MAPPING_FIELD_LABELS.map(({ key, label }) => (
                    <label key={key} className="min-w-0">
                      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
                      <select
                        value={mappingDraft[key] ?? ''}
                        onChange={(event) =>
                          setMappingDraft((current) => ({
                            ...current,
                            [key]: event.target.value || null,
                          }))
                        }
                        className="input-field min-h-10 py-1.5 text-xs"
                      >
                        <option value="">Não usar</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleReprocessWithMapping}
                    className="btn-secondary min-h-10 text-xs"
                  >
                    {isAnalyzing ? 'Reprocessando...' : 'Reprocessar CSV'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3.5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-emerald-800">Categoria padrão para Entradas</span>
                <select
                  value={defaultIncomeCategoryId}
                  onChange={(event) => handleDefaultCategoryChange('INCOME', event.target.value)}
                  className="input-field min-h-10 bg-white py-1.5 text-sm"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-red-800">Categoria padrão para Saídas</span>
                <select
                  value={defaultExpenseCategoryId}
                  onChange={(event) => handleDefaultCategoryChange('EXPENSE', event.target.value)}
                  className="input-field min-h-10 bg-white py-1.5 text-sm"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickCategoryName('');
                  setQuickCategoryError('');
                  setIsQuickCreateOpen((open) => !open);
                }}
                aria-expanded={isQuickCreateOpen}
                className="min-h-9 rounded-lg px-2.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
              >
                + Nova categoria
              </button>

              {rows.length > 0 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleInvertAllTypes}
                  className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                >
                  <ArrowLeftRight size={14} /> Inverter entradas/saídas
                </button>
              )}
            </div>

            {categories.length === 0 && (
              <p className="text-xs text-amber-800">
                Você ainda não possui categorias cadastradas. Crie ao menos uma categoria acima antes de confirmar a importação.
              </p>
            )}

            {isQuickCreateOpen && (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <label className="label-field text-xs" htmlFor="csv-quick-category-name">
                  Nome da nova categoria
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="csv-quick-category-name"
                    type="text"
                    maxLength={50}
                    value={quickCategoryName}
                    onChange={(event) => {
                      setQuickCategoryName(event.target.value);
                      if (quickCategoryError) setQuickCategoryError('');
                    }}
                    onKeyDown={handleQuickCategoryKeyDown}
                    disabled={isCreatingCategory}
                    placeholder="Ex: Moradia"
                    className="input-field min-h-10 flex-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isCreatingCategory}
                      onClick={() => setIsQuickCreateOpen(false)}
                      className="btn-secondary min-h-10 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isCreatingCategory}
                      onClick={() => void saveQuickCategory()}
                      className="btn-primary min-h-10 text-xs"
                    >
                      {isCreatingCategory ? 'Salvando...' : 'Salvar categoria'}
                    </button>
                  </div>
                </div>
                {quickCategoryError && (
                  <p role="alert" className="error-text">
                    {quickCategoryError}
                  </p>
                )}
              </div>
            )}
          </div>

          {rows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Filtrar prévia por tipo">
                  {([
                    ['ALL', `Todos (${countsByType.all})`],
                    ['INCOME', `Entradas (${countsByType.income})`],
                    ['EXPENSE', `Saídas (${countsByType.expense})`],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={typeFilter === value}
                      onClick={() => setTypeFilter(value)}
                      className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
                        typeFilter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Selecionar todos visíveis
                </label>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                <div className="hidden md:block">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-gray-600">
                      <tr>
                        <th className="w-10 px-3 py-2.5 text-center">
                          <span className="sr-only">Selecionar</span>
                        </th>
                        <th className="px-3 py-2.5 font-medium">Data</th>
                        <th className="px-3 py-2.5 font-medium">Descrição</th>
                        <th className="px-3 py-2.5 font-medium">Tipo</th>
                        <th className="px-3 py-2.5 font-medium">Categoria</th>
                        <th className="px-3 py-2.5 font-medium">Pagamento</th>
                        <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visibleRows.map((row) => (
                        <tr key={row.rowKey} className={row.selected ? 'bg-white' : 'bg-gray-50/70 opacity-70'}>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRowSelection(row.rowKey)}
                              aria-label={`Selecionar ${row.description}`}
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{formatDate(row.date)}</td>
                          <td className="max-w-xs px-3 py-2.5">
                            <p className="break-words font-medium text-gray-900">{row.description}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {row.isDuplicate && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                  <AlertTriangle size={11} aria-hidden="true" /> Possível duplicado
                                </span>
                              )}
                              {row.suggestedCategoryName && !row.categoryEditedManually && !row.categoryId && (
                                <span className="text-[11px] text-gray-500">
                                  Sugestão no CSV: {row.suggestedCategoryName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleRowType(row.rowKey)}
                              title="Clique para alternar entre Entrada e Saída"
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                row.type === 'INCOME'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              {row.type === 'INCOME' ? (
                                <>
                                  <ArrowUpCircle size={12} aria-hidden="true" /> Entrada
                                </>
                              ) : (
                                <>
                                  <ArrowDownCircle size={12} aria-hidden="true" /> Saída
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              aria-label={`Categoria de ${row.description}`}
                              value={row.categoryId}
                              onChange={(event) => handleRowCategoryChange(row.rowKey, event.target.value)}
                              className={`input-field min-h-9 min-w-[140px] py-1 text-xs ${
                                row.selected && !row.categoryId ? 'border-amber-400 bg-amber-50/40' : ''
                              }`}
                            >
                              <option value="">Selecione</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            {row.type === 'EXPENSE' ? (
                              <select
                                aria-label={`Pagamento de ${row.description}`}
                                value={row.paymentMethod}
                                onChange={(event) =>
                                  handleRowPaymentChange(row.rowKey, event.target.value as PaymentMethod | '')
                                }
                                className="input-field min-h-9 min-w-[110px] py-1 text-xs"
                              >
                                <option value="">Não informado</option>
                                <option value="DEBIT">Débito</option>
                                <option value="CREDIT">Crédito</option>
                              </select>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${
                              row.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {row.type === 'INCOME' ? '+' : '−'} {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-gray-100 md:hidden">
                  {visibleRows.map((row) => (
                    <div key={row.rowKey} className={`space-y-2.5 p-3 ${row.selected ? 'bg-white' : 'bg-gray-50/70 opacity-70'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex min-w-0 items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelection(row.rowKey)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-gray-900">{row.description}</p>
                            <p className="text-xs text-gray-500">{formatDate(row.date)}</p>
                          </div>
                        </label>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            row.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {row.type === 'INCOME' ? '+' : '−'} {formatCurrency(row.amount)}
                        </span>
                      </div>

                      {row.isDuplicate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          <AlertTriangle size={11} aria-hidden="true" /> Possível duplicado
                        </span>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRowType(row.rowKey)}
                          className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                            row.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {row.type === 'INCOME' ? 'Entrada (alterar)' : 'Saída (alterar)'}
                        </button>
                        <select
                          aria-label={`Categoria de ${row.description}`}
                          value={row.categoryId}
                          onChange={(event) => handleRowCategoryChange(row.rowKey, event.target.value)}
                          className={`input-field min-h-9 py-1 text-xs ${
                            row.selected && !row.categoryId ? 'border-amber-400 bg-amber-50/40' : ''
                          }`}
                        >
                          <option value="">Categoria</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {row.type === 'EXPENSE' && (
                          <select
                            aria-label={`Pagamento de ${row.description}`}
                            value={row.paymentMethod}
                            onChange={(event) =>
                              handleRowPaymentChange(row.rowKey, event.target.value as PaymentMethod | '')
                            }
                            className="input-field min-h-9 py-1 text-xs"
                          >
                            <option value="">Não informado</option>
                            <option value="DEBIT">Débito</option>
                            <option value="CREDIT">Crédito</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Nenhum lançamento válido foi identificado com o mapeamento atual. Ajuste as colunas acima e clique em <strong>Reprocessar CSV</strong>.
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setShowErrorsList((open) => !open)}
                aria-expanded={showErrorsList}
                className="flex min-h-10 w-full items-center justify-between px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>Linhas ignoradas ou com erro ({preview.errors.length})</span>
                <span className="text-gray-500">{showErrorsList ? 'Ocultar' : 'Ver detalhes'}</span>
              </button>
              {showErrorsList && (
                <ul className="max-h-36 divide-y divide-gray-100 overflow-y-auto border-t border-gray-200 px-3.5 py-1 text-xs text-gray-600">
                  {preview.errors.map((err) => (
                    <li key={`${err.lineNumber}-${err.reason}`} className="py-2">
                      <span className="font-medium text-gray-800">Linha {err.lineNumber}:</span> {err.reason}
                      {err.rawText && <span className="block truncate text-gray-400">{err.rawText}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isBusy} className="btn-secondary min-h-11">
              Cancelar
            </button>
            <button
              type="button"
              disabled={isBusy || summary.selectedCount === 0 || summary.missingCategoryCount > 0}
              onClick={() => void handleConfirmImport()}
              className="btn-primary min-h-11"
            >
              {isImporting
                ? 'Importando...'
                : `Importar ${summary.selectedCount} ${summary.selectedCount === 1 ? 'lançamento' : 'lançamentos'}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

