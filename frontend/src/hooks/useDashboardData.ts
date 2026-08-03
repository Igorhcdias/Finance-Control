import { useEffect, useState } from 'react';
import { ChartPoint, DashboardSummary } from '../types';
import { dashboardService } from '../services/dashboard.service';

/**
 * Hook customizado: extrai a lógica de "buscar dados + estado de
 * loading/erro" da página, seguindo o princípio de que componentes de
 * página devem cuidar de layout, não de orquestração de chamadas assíncronas.
 */
export function useDashboardData() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [summaryData, chartData] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getChart(),
        ]);
        if (isMounted) {
          setSummary(summaryData);
          setChart(chartData);
        }
      } catch {
        if (isMounted) setError('Não foi possível carregar os dados do dashboard');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return { summary, chart, isLoading, error };
}
