import { api } from './api';
import { ChartPoint, DashboardSummary, MonthlyComparisonData } from '../types';

export const dashboardService = {
  async getSummary(startDate?: string, endDate?: string): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary', { params: { startDate, endDate } });
    return data;
  },

  async getChart(startDate?: string, endDate?: string): Promise<ChartPoint[]> {
    const { data } = await api.get<ChartPoint[]>('/dashboard/chart', { params: { startDate, endDate } });
    return data;
  },

  async getMonthlyComparison(month1?: string, month2?: string): Promise<MonthlyComparisonData> {
    const { data } = await api.get<MonthlyComparisonData>('/dashboard/monthly-comparison', {
      params: { month1, month2 },
    });
    return data;
  },
};
