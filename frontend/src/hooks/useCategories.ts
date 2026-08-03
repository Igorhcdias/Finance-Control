import { useCallback, useEffect, useState } from 'react';
import { Category } from '../types';
import { categoryService, CategoryInput } from '../services/category.service';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoryService.list();
      setCategories(data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao carregar categorias'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function createCategory(input: CategoryInput) {
    const created = await categoryService.create(input);
    setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    showToast('Categoria criada com sucesso', 'success');
  }

  async function updateCategory(id: string, input: CategoryInput) {
    const updated = await categoryService.update(id, input);
    setCategories((current) => current.map((category) => (category.id === id ? updated : category)));
    showToast('Categoria atualizada com sucesso', 'success');
  }

  async function deleteCategory(id: string) {
    await categoryService.delete(id);
    setCategories((current) => current.filter((category) => category.id !== id));
    showToast('Categoria excluída com sucesso', 'success');
  }

  return { categories, isLoading, createCategory, updateCategory, deleteCategory };
}
