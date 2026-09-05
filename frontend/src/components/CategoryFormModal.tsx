import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Modal } from './Modal';
import { Category } from '../types';

const categoryFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(50),
    color: z.string().regex(/^#([0-9A-Fa-f]{6})$/, 'Escolha uma cor'),
    hasBudgetLimit: z.boolean().default(false),
    budgetLimit: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.hasBudgetLimit) {
        if (!data.budgetLimit || data.budgetLimit.trim() === '') return false;
        const num = Number(data.budgetLimit.replace(',', '.'));
        return !isNaN(num) && num > 0;
      }
      return true;
    },
    {
      message: 'Informe um valor limite válido maior que zero',
      path: ['budgetLimit'],
    }
  );

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryFormData {
  name: string;
  color: string;
  budgetLimit?: number | null;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
}

const suggestedColors = ['#2563eb', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#64748b'];

export function CategoryFormModal({ isOpen, category, onClose, onSubmit }: CategoryFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', color: suggestedColors[0], hasBudgetLimit: false, budgetLimit: '' },
  });

  useEffect(() => {
    if (isOpen) {
      const hasLimit =
        category?.budgetLimit !== null &&
        category?.budgetLimit !== undefined &&
        Number(category.budgetLimit) > 0;

      reset({
        name: category?.name ?? '',
        color: category?.color ?? suggestedColors[0],
        hasBudgetLimit: hasLimit,
        budgetLimit: hasLimit ? String(Number(category!.budgetLimit)) : '',
      });
    }
  }, [isOpen, category, reset]);

  const selectedColor = watch('color');
  const hasBudgetLimit = watch('hasBudgetLimit');

  async function handleFormSubmit(data: CategoryFormValues) {
    let budgetLimit: number | null = null;
    if (data.hasBudgetLimit && data.budgetLimit) {
      const num = Number(data.budgetLimit.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        budgetLimit = num;
      }
    }

    await onSubmit({
      name: data.name,
      color: data.color,
      budgetLimit,
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <div className="mb-4">
          <label className="label-field" htmlFor="category-name">Nome</label>
          <input id="category-name" className="input-field" placeholder="Ex: Alimentação" {...register('name')} />
          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>

        <div className="mb-5">
          <label className="label-field">Cor</label>
          <div className="flex flex-wrap gap-2">
            {suggestedColors.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setValue('color', color, { shouldValidate: true })}
                aria-label={`Selecionar cor ${color}`}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  selectedColor === color ? 'scale-110 border-gray-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {errors.color && <p className="error-text">{errors.color.message}</p>}
        </div>

        <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50/70 p-3.5">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="has-budget-limit"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              {...register('hasBudgetLimit')}
            />
            <label htmlFor="has-budget-limit" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Definir limite de orçamento mensal para esta categoria
            </label>
          </div>

          {hasBudgetLimit && (
            <div className="mt-3 pt-3 border-t border-gray-200/60">
              <label className="label-field" htmlFor="category-budget-limit">
                Limite mensal (R$)
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500 font-medium">
                  R$
                </span>
                <input
                  id="category-budget-limit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field pl-10"
                  placeholder="0,00"
                  {...register('budgetLimit')}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Você pode ajustar esse limite a qualquer momento caso seus custos variem de mês a mês.
              </p>
              {errors.budgetLimit && <p className="error-text">{errors.budgetLimit.message}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

