import { api } from './api';
export interface InvestmentInput { description: string; amount: number; date: string }
export interface Investment extends Omit<InvestmentInput, 'amount'> { id: string; amount: string | number }
export const investmentService = {
  async list() { return (await api.get<Investment[]>('/investments')).data; },
  async create(input: InvestmentInput) { await api.post('/investments', input); },
  async update(id: string, input: InvestmentInput) { await api.put(`/investments/${id}`, input); },
  async delete(id: string) { await api.delete(`/investments/${id}`); },
};
