import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import type { Category, Transaction, TransactionType } from '../types';
import type { CategoryInput } from '../services/category.service';
import { toInputDate } from '../utils/format';
import { getApiErrorMessage } from '../services/api';
import { categoryNameSchema } from '../schemas/category.schema';

const transactionFormSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().min(2, 'Descrição deve ter no mínimo 2 caracteres').max(255),
  amount: z.coerce.number({ invalid_type_error: 'Informe um valor' }).positive('O valor deve ser positivo'),
  date: z.string().min(1, 'Informe a data'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  paymentMethod: z.enum(['DEBIT', 'CREDIT']).optional(),
}).superRefine((data, context) => {
  if (data.type === 'EXPENSE' && !data.paymentMethod) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentMethod'], message: 'Selecione débito ou crédito' });
  }
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCreateCategory: (input: CategoryInput) => Promise<Category>;
  initialType?: TransactionType;
  accessible?: boolean;
  defaultDate?: string;
}

export function TransactionFormModal({
  isOpen,
  transaction,
  categories,
  onClose,
  onSubmit,
  onCreateCategory,
  initialType = 'EXPENSE',
  accessible = false,
  defaultDate,
}: TransactionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type ?? initialType,
      description: '',
      date: '',
      categoryId: '',
    },
  });

  const selectedType = watch('type');
  const selectedCategoryId = watch('categoryId');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryError, setQuickCategoryError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const isCreatingCategoryRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      reset({
        type: transaction?.type ?? initialType,
        description: transaction?.description ?? '',
        amount: transaction?.amount ?? undefined,
        date: transaction ? toInputDate(transaction.date) : defaultDate ?? toInputDate(new Date()),
        categoryId: transaction?.categoryId ?? categories[0]?.id ?? '',
        paymentMethod: transaction?.type === 'EXPENSE' ? transaction.paymentMethod ?? undefined : undefined,
      });
    }
  }, [isOpen, transaction, initialType, reset, defaultDate]);

  useEffect(() => {
    if (isOpen && !transaction && !selectedCategoryId && categories[0]) {
      setValue('categoryId', categories[0].id, { shouldValidate: true });
    }
  }, [isOpen, transaction, selectedCategoryId, categories, setValue]);

  function changeType(type: TransactionType) {
    setValue('type', type, { shouldValidate: true });
    if (type === 'INCOME') setValue('paymentMethod', undefined, { shouldValidate: true });
    clearErrors('root');
  }

  function openQuickCategoryForm() {
    if (isQuickCreateOpen) return;
    setQuickCategoryName('');
    setQuickCategoryError('');
    setIsQuickCreateOpen(true);
  }

  function closeQuickCategoryForm() {
    if (isCreatingCategoryRef.current) return;
    setQuickCategoryName('');
    setQuickCategoryError('');
    setIsQuickCreateOpen(false);
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
    const typeAtCreation = getValues('type');
    try {
      const created = await onCreateCategory({
        name: parsedName.data,
        color: '#2563eb',
        budgetLimit: null,
      });
      if (getValues('type') === typeAtCreation) {
        setValue('categoryId', created.id, { shouldDirty: true, shouldValidate: true });
      }
      setQuickCategoryName('');
      setIsQuickCreateOpen(false);
    } catch (error) {
      setQuickCategoryError(getApiErrorMessage(error, 'Não foi possível cadastrar a categoria. Tente novamente.'));
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

  async function handleFormSubmit(data: TransactionFormData) {
    clearErrors('root');
    try {
      await onSubmit({
        ...data,
        paymentMethod: data.type === 'EXPENSE' ? data.paymentMethod : undefined,
      });
      onClose();
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error, 'Não foi possível salvar o lançamento. Tente novamente.') });
    }
  }

  const noun = selectedType === 'INCOME' ? 'receita' : 'despesa';
  const title = transaction ? `Editar ${noun}` : 'Novo lançamento';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} accessible={accessible} dismissible={!isSubmitting}>
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate aria-busy={isSubmitting || isCreatingCategory || undefined}>
        <fieldset disabled={isSubmitting} className="min-w-0">
          <div className="mb-5">
            <span className="label-field">Tipo de lançamento</span>
            <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1" role="group" aria-label="Tipo de lançamento">
              {([
                ['EXPENSE', 'Despesa'],
                ['INCOME', 'Receita'],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selectedType === type}
                  onClick={() => changeType(type)}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors ${selectedType === type
                    ? type === 'INCOME' ? 'bg-white text-emerald-700 shadow-sm' : 'bg-white text-red-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="label-field" htmlFor="transaction-description">Descrição</label>
            <input
              id="transaction-description"
              className="input-field min-h-11"
              placeholder={selectedType === 'INCOME' ? 'Ex: Salário' : 'Ex: Supermercado'}
              {...register('description')}
            />
            {errors.description && <p className="error-text">{errors.description.message}</p>}
          </div>

          <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="label-field" htmlFor="transaction-amount">Valor (R$)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-gray-500">R$</span>
                <input
                  id="transaction-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  className="input-field min-h-11 min-w-0 pl-10"
                  placeholder="0,00"
                  {...register('amount')}
                />
              </div>
              {errors.amount && <p className="error-text">{errors.amount.message}</p>}
            </div>
            <div className="min-w-0">
              <label className="label-field" htmlFor="transaction-date">Data</label>
              <input id="transaction-date" type="date" className="input-field min-h-11 min-w-0 max-w-full" {...register('date')} />
              {errors.date && <p className="error-text">{errors.date.message}</p>}
            </div>
          </div>

          <div className="mb-4 min-w-0">
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
              <label className="label-field mb-0" htmlFor="transaction-category">Categoria</label>
              <button
                type="button"
                onClick={openQuickCategoryForm}
                aria-expanded={isQuickCreateOpen}
                aria-controls="quick-category-form"
                className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                + Nova categoria
              </button>
            </div>
            <select id="transaction-category" className="input-field min-h-11" {...register('categoryId')}>
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">Cadastre uma categoria antes de salvar este lançamento.</p>
            )}
            {errors.categoryId && <p className="error-text">{errors.categoryId.message}</p>}

            {isQuickCreateOpen && (
              <div id="quick-category-form" className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="label-field" htmlFor="quick-category-name">Nome da categoria</label>
                <input
                  id="quick-category-name"
                  type="text"
                  maxLength={50}
                  autoFocus
                  value={quickCategoryName}
                  onChange={(event) => {
                    setQuickCategoryName(event.target.value);
                    if (quickCategoryError) setQuickCategoryError('');
                  }}
                  onKeyDown={handleQuickCategoryKeyDown}
                  disabled={isCreatingCategory}
                  aria-invalid={!!quickCategoryError}
                  aria-describedby={quickCategoryError ? 'quick-category-error' : undefined}
                  className="input-field min-h-11"
                  placeholder="Ex: Moradia"
                />
                {quickCategoryError && (
                  <p id="quick-category-error" role="alert" className="error-text">{quickCategoryError}</p>
                )}
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeQuickCategoryForm}
                    disabled={isCreatingCategory}
                    className="btn-secondary min-h-11"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveQuickCategory()}
                    disabled={isCreatingCategory}
                    className="btn-primary min-h-11"
                  >
                    {isCreatingCategory ? 'Salvando...' : 'Salvar categoria'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedType === 'EXPENSE' && (
            <div className="mb-6">
              <label className="label-field" htmlFor="transaction-payment-method">Forma de pagamento</label>
              <select
                id="transaction-payment-method"
                className="input-field min-h-11"
                {...register('paymentMethod', {
                  setValueAs: (value) => value === '' ? undefined : value,
                })}
              >
                <option value="">Selecione</option>
                <option value="DEBIT">Débito</option>
                <option value="CREDIT">Crédito</option>
              </select>
              {errors.paymentMethod && <p className="error-text">{errors.paymentMethod.message}</p>}
            </div>
          )}

          {errors.root?.message && <p role="alert" className="mb-4 text-sm text-red-700">{errors.root.message}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary min-h-11">Cancelar</button>
            <button type="submit" disabled={isSubmitting || isCreatingCategory} className="btn-primary min-h-11">
              {isSubmitting ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
