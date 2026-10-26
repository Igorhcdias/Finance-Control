import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../Modal';
import { TransactionFormData, TransactionFormModal } from '../TransactionFormModal';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../services/api';
import { categoryService } from '../../services/category.service';
import { transactionService } from '../../services/transaction.service';
import { Category, TransactionType } from '../../types';
import { CategoryInput } from '../../services/category.service';

interface NewTransactionActionProps {
  onCreated: () => void;
}

type CategoryStatus = 'idle' | 'loading' | 'loaded' | 'error';

function todayInputDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function NewTransactionAction({ onCreated }: NewTransactionActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus>('idle');
  const [categoryError, setCategoryError] = useState('');
  const [defaultDate, setDefaultDate] = useState(todayInputDate);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const requestId = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();

  useEffect(() => () => { requestId.current += 1; }, []);

  async function loadCategories() {
    const currentRequest = ++requestId.current;
    setCategoryStatus('loading');
    setCategoryError('');
    try {
      const result = await categoryService.list();
      if (currentRequest !== requestId.current) return;
      setCategories(result);
      setCategoryStatus('loaded');
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setCategoryError(getApiErrorMessage(error, 'Não foi possível carregar as categorias.'));
      setCategoryStatus('error');
    }
  }

  function openAction() {
    if (isOpen || savingRef.current) return;
    setType(null);
    setDefaultDate(todayInputDate());
    setIsOpen(true);
    void loadCategories();
  }

  const closeAction = useCallback(() => {
    if (savingRef.current) return;
    requestId.current += 1;
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  async function createTransaction(data: TransactionFormData) {
    savingRef.current = true;
    setIsSaving(true);
    try {
      const created = await transactionService.create(data);
      const successMessage = data.type === 'INCOME' ? 'Receita cadastrada com sucesso.' : 'Despesa cadastrada com sucesso.';
      showToast(
        created.budgetWarning ? `${successMessage} ${created.budgetWarning}` : successMessage,
        created.budgetWarning ? 'warning' : 'success',
      );
      onCreated();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function createCategory(input: CategoryInput) {
    const created = await categoryService.create(input);
    setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    showToast('Categoria criada com sucesso', 'success');
    return created;
  }

  const showForm = isOpen && type !== null && categoryStatus === 'loaded' && categories.length > 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openAction}
        disabled={isSaving}
        aria-haspopup="dialog"
        className="btn-primary min-h-11 w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:w-auto"
      >
        <Plus size={18} aria-hidden="true" />
        Novo lançamento
      </button>

      <Modal isOpen={isOpen && !showForm} onClose={closeAction} title="Novo lançamento" accessible>
        <p className="mb-4 text-sm text-gray-500">O que você deseja registrar?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={type === 'INCOME'}
            onClick={() => setType('INCOME')}
            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-semibold text-primary-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${type === 'INCOME' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'}`}
          >
            <ArrowDownLeft size={24} aria-hidden="true" />
            Receita
          </button>
          <button
            type="button"
            aria-pressed={type === 'EXPENSE'}
            onClick={() => setType('EXPENSE')}
            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-semibold text-red-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${type === 'EXPENSE' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-red-400 hover:bg-red-50'}`}
          >
            <ArrowUpRight size={24} aria-hidden="true" />
            Despesa
          </button>
        </div>

        {categoryStatus === 'loading' && (
          <p role="status" className="mt-5 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            Carregando categorias…
          </p>
        )}
        {categoryStatus === 'error' && (
          <div className="mt-5 rounded-lg bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">{categoryError}</p>
            <button type="button" className="btn-secondary mt-3 min-h-11" onClick={() => void loadCategories()}>
              <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        )}
        {categoryStatus === 'loaded' && categories.length === 0 && (
          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Cadastre uma categoria para organizar seus lançamentos.</p>
            <Link to="/categorias" onClick={closeAction} className="btn-secondary mt-3 min-h-11">Cadastrar categoria</Link>
          </div>
        )}
      </Modal>

      <TransactionFormModal
        isOpen={showForm}
        initialType={type ?? 'INCOME'}
        transaction={null}
        categories={categories}
        onCreateCategory={createCategory}
        onClose={closeAction}
        onSubmit={createTransaction}
        defaultDate={defaultDate}
        accessible
      />
    </>
  );
}
