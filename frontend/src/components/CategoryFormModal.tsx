import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Modal } from './Modal';
import { Category } from '../types';

const categoryFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(50),
  color: z.string().regex(/^#([0-9A-Fa-f]{6})$/, 'Escolha uma cor'),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

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
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', color: suggestedColors[0] },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ name: category?.name ?? '', color: category?.color ?? suggestedColors[0] });
    }
  }, [isOpen, category, reset]);

  const selectedColor = watch('color');

  async function handleFormSubmit(data: CategoryFormData) {
    await onSubmit(data);
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

        <div className="mb-6">
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
