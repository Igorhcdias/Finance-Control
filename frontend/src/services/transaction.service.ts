import { api } from './api';
import { PaginatedResponse, Transaction, TransactionType } from '../types';

export interface TransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const transactionService = {
  async list(filters: TransactionFilters = {}): Promise<PaginatedResponse<Transaction>> {
    const { data } = await api.get<PaginatedResponse<Transaction>>('/transactions', {
      params: filters,
    });
    return data;
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const { data } = await api.post<Transaction>('/transactions', input);
    return data;
  },

  async update(id: string, input: Partial<TransactionInput>): Promise<Transaction> {
    const { data } = await api.put<Transaction>(`/transactions/${id}`, input);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },
};
