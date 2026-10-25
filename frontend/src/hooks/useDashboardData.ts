import { useCallback, useEffect, useState } from 'react';
import type { ChartPoint, DashboardSummary } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { getApiErrorMessage } from '../services/api';

interface DashboardState {
  key: string;
  summary: DashboardSummary | null;
  chart: ChartPoint[];
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(startDate: string, endDate: string) {
  const [revision, setRevision] = useState(0);
  const key = `${startDate}/${endDate}/${revision}`;
  const [state, setState] = useState<DashboardState>({ key, summary: null, chart: [], isLoading: true, error: null });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ key, summary: null, chart: [], isLoading: true, error: null });

    async function loadData() {
      try {
        const [summary, chart] = await Promise.all([
          dashboardService.getSummary(startDate, endDate, controller.signal),
          dashboardService.getChart(startDate, endDate, controller.signal),
        ]);
        if (!controller.signal.aborted) setState({ key, summary, chart, isLoading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ key, summary: null, chart: [], isLoading: false, error: getApiErrorMessage(error, 'Não foi possível carregar os dados do dashboard.') });
          controller.abort();
        }
      }
    }

    void loadData();
    return () => controller.abort();
  }, [startDate, endDate, key]);

  // Never associate the previous response with a newly selected period, even for one render.
  const current = state.key === key;
  return {
    summary: current ? state.summary : null,
    chart: current ? state.chart : [],
    error: current ? state.error : null,
    isLoading: !current || state.isLoading,
    refresh,
  };
}
