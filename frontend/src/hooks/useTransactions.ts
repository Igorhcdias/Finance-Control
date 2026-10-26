import { useCallback, useEffect, useRef, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { transactionService, TransactionInput } from '../services/transaction.service';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

interface UseTransactionsOptions {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

const PAGE_SIZE = 20;

export function useTransactions({ type, startDate, endDate }: UseTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const { showToast } = useToast();

  const loadTransactions = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setLoadingError(null);
    try {
      const result = await transactionService.list({
        type,
        search: search || undefined,
        categoryId: categoryId || undefined,
        startDate,
        endDate,
        page,
        pageSize: PAGE_SIZE,
      });
      if (currentRequest !== requestId.current) return;
      setTransactions(result.items);
      setPagination(result.pagination);
    } catch (error) {
      if (currentRequest === requestId.current) {
        const message = getApiErrorMessage(error, 'Erro ao carregar transações');
        setLoadingError(message);
        showToast(message, 'error');
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [type, search, categoryId, startDate, endDate, page, showToast]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  async function createTransaction(input: Omit<TransactionInput, 'type'> & { type: TransactionType }) {
    const created = await transactionService.create(input);
    if (page > 1) setPage(1);
    else await loadTransactions();
    if (created.budgetWarning) {
      showToast(`Despesa cadastrada com sucesso. ${created.budgetWarning}`, 'warning');
    } else {
      showToast(created.type === 'INCOME' ? 'Receita cadastrada com sucesso' : 'Despesa cadastrada com sucesso', 'success');
    }
  }

  async function updateTransaction(id: string, input: Omit<TransactionInput, 'type'> & { type: TransactionType }) {
    const updated = await transactionService.update(id, input);
    await loadTransactions();
    showToast(
      updated.budgetWarning ? `Transação atualizada com sucesso. ${updated.budgetWarning}` : 'Transação atualizada com sucesso',
      updated.budgetWarning ? 'warning' : 'success',
    );
  }

  async function deleteTransaction(id: string) {
    await transactionService.delete(id);
    if (transactions.length === 1 && page > 1) setPage((current) => current - 1);
    else await loadTransactions();
    showToast('Transação excluída com sucesso', 'success');
  }

  return {
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
  };
}
