import { useCallback, useEffect, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { transactionService, TransactionInput } from '../services/transaction.service';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

interface UseTransactionsOptions {
  type: TransactionType;
}

export function useTransactions({ type }: UseTransactionsOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const { showToast } = useToast();

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await transactionService.list({
        type,
        search: search || undefined,
        categoryId: categoryId || undefined,
        pageSize: 100,
      });
      setTransactions(result.items);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao carregar transações'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [type, search, categoryId, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function createTransaction(input: Omit<TransactionInput, 'type'>) {
    const created = await transactionService.create({ ...input, type });
    setTransactions((current) => [created, ...current]);
    showToast(type === 'INCOME' ? 'Receita cadastrada com sucesso' : 'Despesa cadastrada com sucesso', 'success');
  }

  async function updateTransaction(id: string, input: Omit<TransactionInput, 'type'>) {
    const updated = await transactionService.update(id, { ...input, type });
    setTransactions((current) => current.map((item) => (item.id === id ? updated : item)));
    showToast('Transação atualizada com sucesso', 'success');
  }

  async function deleteTransaction(id: string) {
    await transactionService.delete(id);
    setTransactions((current) => current.filter((item) => item.id !== id));
    showToast('Transação excluída com sucesso', 'success');
  }

  return {
    transactions,
    isLoading,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
