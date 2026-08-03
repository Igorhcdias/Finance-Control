import { api } from './api';
import { ChartPoint, DashboardSummary } from '../types';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary');
    return data;
  },

  async getChart(months = 6): Promise<ChartPoint[]> {
    const { data } = await api.get<ChartPoint[]>('/dashboard/chart', { params: { months } });
    return data;
  },
};
