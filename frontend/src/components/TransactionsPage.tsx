import { useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { TransactionFormModal, TransactionFormData } from './TransactionFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Loading } from './Loading';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

interface TransactionsPageProps {
  type: TransactionType;
  title: string;
  subtitle: string;
}

/**
 * Componente compartilhado por ReceitasPage e DespesasPage.
 * Por que um único componente parametrizado por `type` em vez de duplicar
 * a página inteira duas vezes? Receitas e despesas têm exatamente a mesma
 * estrutura de tela (lista, busca, filtro, formulário, exclusão) — a única
 * diferença real é o "tipo" da transação e os textos exibidos. Duplicar
 * esse componente violaria DRY e criaria duas fontes de manutenção para o
 * mesmo comportamento.
 */
export function TransactionsPage({ type, title, subtitle }: TransactionsPageProps) {
  const {
    transactions,
    isLoading,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ type });
  const { categories } = useCategories();
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary">
          <Plus size={18} /> Nova {type === 'INCOME' ? 'receita' : 'despesa'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por descrição..."
            className="input-field pl-9"
          />
        </div>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="input-field w-full sm:w-56">
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Loading />
      ) : transactions.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          Nenhuma {type === 'INCOME' ? 'receita' : 'despesa'} encontrada.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800">{transaction.description}</td>
                  <td className="px-5 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}
                    >
                      {transaction.category.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(transaction.date)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditForm(transaction)}
                        aria-label="Editar"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(transaction)}
                        aria-label="Excluir"
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionFormModal
        isOpen={isFormOpen}
        type={type}
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={!!transactionToDelete}
        title={`Excluir ${type === 'INCOME' ? 'receita' : 'despesa'}`}
        description={`Tem certeza que deseja excluir "${transactionToDelete?.description}"? Essa ação não pode ser desfeita.`}
        isLoading={isDeleting}
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
