import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Modal } from './Modal';
import { Category, Transaction, TransactionType } from '../types';
import { toInputDate } from '../utils/format';
import { getApiErrorMessage } from '../services/api';

const transactionFormSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter no mínimo 2 caracteres').max(255),
  amount: z.coerce.number({ invalid_type_error: 'Informe um valor' }).positive('O valor deve ser positivo'),
  date: z.string().min(1, 'Informe a data'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  paymentMethod: z.enum(['DEBIT', 'CREDIT']).optional(),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  type: TransactionType;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  accessible?: boolean;
  defaultDate?: string;
}

export function TransactionFormModal({
  isOpen,
  type,
  transaction,
  categories,
  onClose,
  onSubmit,
  accessible = false,
  defaultDate,
}: TransactionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema.refine(
      (data) => type !== 'EXPENSE' || !!data.paymentMethod,
      { path: ['paymentMethod'], message: 'Selecione débito ou crédito' },
    )),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        description: transaction?.description ?? '',
        amount: transaction?.amount ?? undefined,
        date: transaction ? toInputDate(transaction.date) : defaultDate ?? toInputDate(new Date()),
        categoryId: transaction?.categoryId ?? categories[0]?.id ?? '',
        paymentMethod: type === 'EXPENSE' ? transaction?.paymentMethod ?? undefined : undefined,
      });
    }
  }, [isOpen, transaction, categories, reset, type, defaultDate]);

  async function handleFormSubmit(data: TransactionFormData) {
    clearErrors('root');
    try {
      await onSubmit({ ...data, paymentMethod: type === 'EXPENSE' ? data.paymentMethod : undefined });
      onClose();
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error, 'Não foi possível salvar o lançamento. Tente novamente.') });
    }
  }

  const noun = type === 'INCOME' ? 'receita' : 'despesa';
  const isLocked = accessible && isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? `Editar ${noun}` : `Nova ${noun}`} accessible={accessible} dismissible={!isLocked}>
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          Você precisa cadastrar ao menos uma categoria antes de lançar uma {noun}.
        </p>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate aria-busy={isLocked || undefined}>
          <fieldset disabled={isLocked} className="min-w-0">
            <div className="mb-4">
              <label className="label-field" htmlFor="description">Descrição</label>
              <input
                id="description"
                className="input-field"
                placeholder={type === 'INCOME' ? 'Ex: Salário' : 'Ex: Supermercado'}
                {...register('description')}
              />
              {errors.description && <p className="error-text">{errors.description.message}</p>}
            </div>

            <div className={`mb-4 grid gap-3 ${accessible ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
              <div className="min-w-0">
                <label className="label-field" htmlFor="amount">Valor (R$)</label>
                <input id="amount" type="number" step="0.01" className="input-field min-w-0" placeholder="0,00" {...register('amount')} />
                {errors.amount && <p className="error-text">{errors.amount.message}</p>}
              </div>
              <div className="min-w-0">
                <label className="label-field" htmlFor="date">Data</label>
                <input id="date" type="date" className="input-field min-w-0 max-w-full" {...register('date')} />
                {errors.date && <p className="error-text">{errors.date.message}</p>}
              </div>
            </div>

            <div className="mb-6">
              <label className="label-field" htmlFor="categoryId">Categoria</label>
              <select id="categoryId" className="input-field" {...register('categoryId')}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="error-text">{errors.categoryId.message}</p>}
            </div>

            {type === 'EXPENSE' && (
              <div className="mb-6">
                <label className="label-field" htmlFor="paymentMethod">Forma de pagamento</label>
                <select id="paymentMethod" className="input-field" {...register('paymentMethod', {
                  setValueAs: (value) => value === '' ? undefined : value,
                })}>
                  <option value="">Selecione</option>
                  <option value="DEBIT">Débito</option>
                  <option value="CREDIT">Crédito</option>
                </select>
                {errors.paymentMethod && <p className="error-text">{errors.paymentMethod.message}</p>}
              </div>
            )}

            {errors.root?.message && <p role="alert" className="mb-4 text-sm text-red-700">{errors.root.message}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isLocked} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
