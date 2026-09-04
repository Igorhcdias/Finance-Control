import { api } from './api';
import { ChartPoint, DashboardSummary } from '../types';

export const dashboardService = {
  async getSummary(startDate?: string, endDate?: string): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary', { params: { startDate, endDate } });
    return data;
  },

  async getChart(startDate?: string, endDate?: string): Promise<ChartPoint[]> {
    const { data } = await api.get<ChartPoint[]>('/dashboard/chart', { params: { startDate, endDate } });
    return data;
  },
};
