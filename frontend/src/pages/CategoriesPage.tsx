import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { CategoryFormModal, CategoryFormData } from '../components/CategoryFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loading } from '../components/Loading';
import { Category } from '../types';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';
import { formatCurrency } from '../utils/format';

export function CategoriesPage() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openCreateForm() {
    setEditingCategory(null);
    setIsFormOpen(true);
  }

  function openEditForm(category: Category) {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  async function handleSubmit(data: CategoryFormData) {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
      } else {
        await createCategory(data);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao salvar categoria'), 'error');
    }
  }

  async function handleConfirmDelete() {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível excluir a categoria'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500">Organize suas receitas e despesas por categoria</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary">
          <Plus size={18} /> Nova categoria
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          Nenhuma categoria cadastrada ainda. Crie a primeira para começar a organizar suas transações.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="card flex flex-col justify-between gap-3 p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-semibold text-gray-900 text-base">{category.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(category)}
                    aria-label={`Editar ${category.name}`}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(category)}
                    aria-label={`Excluir ${category.name}`}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">Orçamento mensal:</span>
                {category.budgetLimit && Number(category.budgetLimit) > 0 ? (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {formatCurrency(Number(category.budgetLimit))}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Sem limite</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryFormModal
        isOpen={isFormOpen}
        category={editingCategory}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${categoryToDelete?.name}"? Categorias com transações vinculadas não podem ser excluídas.`}
        isLoading={isDeleting}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
