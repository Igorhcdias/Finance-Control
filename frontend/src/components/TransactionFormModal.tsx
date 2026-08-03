import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Modal } from './Modal';
import { Category, Transaction, TransactionType } from '../types';
import { toInputDate } from '../utils/format';

const transactionFormSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter no mínimo 2 caracteres').max(255),
  amount: z.coerce.number({ invalid_type_error: 'Informe um valor' }).positive('O valor deve ser positivo'),
  date: z.string().min(1, 'Informe a data'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  type: TransactionType;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function TransactionFormModal({
  isOpen,
  type,
  transaction,
  categories,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({ resolver: zodResolver(transactionFormSchema) });

  useEffect(() => {
    if (isOpen) {
      reset({
        description: transaction?.description ?? '',
        amount: transaction?.amount ?? undefined,
        date: transaction ? toInputDate(transaction.date) : toInputDate(new Date()),
        categoryId: transaction?.categoryId ?? categories[0]?.id ?? '',
      });
    }
  }, [isOpen, transaction, categories, reset]);

  async function handleFormSubmit(data: TransactionFormData) {
    await onSubmit(data);
    onClose();
  }

  const noun = type === 'INCOME' ? 'receita' : 'despesa';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? `Editar ${noun}` : `Nova ${noun}`}>
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          Você precisa cadastrar ao menos uma categoria antes de lançar uma {noun}.
        </p>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
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

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label-field" htmlFor="amount">Valor (R$)</label>
              <input id="amount" type="number" step="0.01" className="input-field" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="error-text">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label-field" htmlFor="date">Data</label>
              <input id="date" type="date" className="input-field" {...register('date')} />
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

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
