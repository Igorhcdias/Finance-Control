import { api } from './api';
import { Category } from '../types';

export interface CategoryInput {
  name: string;
  color: string;
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/categories');
    return data;
  },

  async create(input: CategoryInput): Promise<Category> {
    const { data } = await api.post<Category>('/categories', input);
    return data;
  },

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const { data } = await api.put<Category>(`/categories/${id}`, input);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
