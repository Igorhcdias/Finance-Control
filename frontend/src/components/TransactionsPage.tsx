import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Search, Scale, Trash2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { TransactionFormModal, TransactionFormData } from './TransactionFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Loading } from './Loading';
import { MetricCard } from './MetricCard';
import { PeriodFilter } from './dashboard/PeriodFilter';
import { useDashboardData } from '../hooks/useDashboardData';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { getDashboardPeriod, type DashboardPeriod } from '../utils/dashboard';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

type TransactionTypeFilter = '' | TransactionType;

export function TransactionsPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(() => getDashboardPeriod('lastSixMonths'));
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('');
  const {
    transactions,
    pagination,
    isLoading,
    loadingError,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    page,
    setPage,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({
    type: typeFilter || undefined,
    startDate: period.startDate,
    endDate: period.endDate,
  });
  const { categories, createCategory } = useCategories();
  const { summary, isLoading: isSummaryLoading, error: summaryError } = useDashboardData(period.startDate, period.endDate);
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryId, search, period.startDate, period.endDate, setPage]);

  useEffect(() => {
    if (!isLoading && page > Math.max(pagination.totalPages, 1)) {
      setPage(Math.max(pagination.totalPages, 1));
    }
  }, [isLoading, page, pagination.totalPages, setPage]);

  function openCreateForm() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }

  async function handleSubmit(data: TransactionFormData) {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await createTransaction(data);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao salvar transação'), 'error');
      throw error;
    }
  }

  async function handleConfirmDelete() {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível excluir'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lançamentos</h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe receitas e despesas em um só lugar.</p>
        </div>
        <button type="button" onClick={openCreateForm} className="btn-primary min-h-11 w-full sm:w-auto">
          <Plus size={18} /> Novo lançamento
        </button>
      </div>

      {isSummaryLoading ? (
        <div role="status" className="card text-sm text-gray-500">Carregando resumo financeiro...</div>
      ) : summaryError || !summary ? (
        <div className="card" role="alert">
          <p className="font-medium text-gray-900">Não foi possível carregar o resumo financeiro.</p>
          <p className="mt-1 text-sm text-gray-600">{summaryError ?? 'Tente novamente em instantes.'}</p>
        </div>
      ) : (
        <section aria-label="Resumo financeiro do período" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Total de receitas"
            value={formatCurrency(summary.periodIncome)}
            icon={<ArrowUpCircle size={20} />}
            tone="positive"
          />
          <MetricCard
            label="Total de despesas"
            value={formatCurrency(summary.periodExpense)}
            icon={<ArrowDownCircle size={20} />}
            tone="negative"
          />
          <MetricCard
            label="Resultado do período"
            value={formatCurrency(summary.periodTotal)}
            icon={<Scale size={20} />}
            tone={summary.periodTotal === 0 ? 'neutral' : summary.periodTotal > 0 ? 'positive' : 'negative'}
            description="Receitas menos despesas; não representa o saldo disponível."
          />
        </section>
      )}

      <PeriodFilter period={period} onChange={setPeriod} heading="Período dos lançamentos e do resumo" />

      <section aria-label="Filtros de lançamentos" className="card min-w-0 space-y-3">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Pesquisar por descrição</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar descrição..."
              className="input-field min-h-11 pl-9"
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Tipo de lançamento</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TransactionTypeFilter)} className="input-field min-h-11">
              <option value="">Todos os lançamentos</option>
              <option value="INCOME">Apenas receitas</option>
              <option value="EXPENSE">Apenas despesas</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Categoria</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="input-field min-h-11">
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <Loading />
      ) : loadingError ? (
        <div className="card" role="alert">
          <p className="font-medium text-gray-900">Não foi possível carregar os lançamentos.</p>
          <p className="mt-1 text-sm text-gray-600">{loadingError}</p>
          <button type="button" onClick={() => void loadTransactions()} className="btn-secondary mt-4 min-h-11">Tentar novamente</button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center">
          <p className="font-medium text-gray-800">Nenhum lançamento encontrado.</p>
          <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou cadastre um novo lançamento.</p>
        </div>
      ) : (
        <div className="card min-w-0 overflow-hidden p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="max-w-xs break-words px-5 py-3 text-gray-800">{transaction.description}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}>
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatDate(transaction.date)}</td>
                    <td className="px-5 py-3">
                      <TransactionTypeBadge type={transaction.type} />
                    </td>
                    <td className={`whitespace-nowrap px-5 py-3 text-right font-medium ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {transaction.type === 'INCOME' ? '+' : '−'} {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <TransactionActions transaction={transaction} onEdit={openEditForm} onDelete={setTransactionToDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-gray-100 md:hidden">
            {transactions.map((transaction) => (
              <article key={transaction.id} className="min-w-0 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">{transaction.description}</p>
                    <p className="mt-1 text-sm text-gray-500">{formatDate(transaction.date)}</p>
                  </div>
                  <span className={`shrink-0 break-words text-right text-sm font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {transaction.type === 'INCOME' ? '+' : '−'} {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TransactionTypeBadge type={transaction.type} />
                    <span className="max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}>
                      {transaction.category.name}
                    </span>
                  </div>
                  <TransactionActions transaction={transaction} onEdit={openEditForm} onDelete={setTransactionToDelete} />
                </div>
              </article>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <p>Página {pagination.page} de {pagination.totalPages} · {pagination.total} lançamentos</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-secondary min-h-11 flex-1 sm:flex-none">Anterior</button>
                <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages} className="btn-secondary min-h-11 flex-1 sm:flex-none">Próxima</button>
              </div>
            </div>
          )}
        </div>
      )}

      <TransactionFormModal
        isOpen={isFormOpen}
        transaction={editingTransaction}
        categories={categories}
        onCreateCategory={createCategory}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        accessible
      />

      <ConfirmDialog
        isOpen={!!transactionToDelete}
        title={`Excluir ${transactionToDelete?.type === 'INCOME' ? 'receita' : 'despesa'}`}
        description={`Tem certeza que deseja excluir "${transactionToDelete?.description}"? Essa ação não pode ser desfeita.`}
        isLoading={isDeleting}
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const isIncome = type === 'INCOME';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {isIncome ? <ArrowUpCircle size={14} aria-hidden="true" /> : <ArrowDownCircle size={14} aria-hidden="true" />}
      {isIncome ? 'Receita' : 'Despesa'}
    </span>
  );
}

function TransactionActions({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        aria-label={`Editar ${transaction.description}`}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary-600"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        aria-label={`Excluir ${transaction.description}`}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
