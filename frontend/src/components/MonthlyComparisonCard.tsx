import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, TrendingDown, TrendingUp, Minus, Calendar } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardService } from '../services/dashboard.service';
import { MonthlyComparisonData } from '../types';
import { formatCurrency } from '../utils/format';

export function MonthlyComparisonCard() {
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return options;
  }, []);

  const [month1, setMonth1] = useState(monthOptions[0]?.value ?? '');
  const [month2, setMonth2] = useState(monthOptions[1]?.value ?? '');
  const [data, setData] = useState<MonthlyComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month1 || !month2) return;

    let isMounted = true;
    async function fetchComparison() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await dashboardService.getMonthlyComparison(month1, month2);
        if (isMounted) setData(result);
      } catch {
        if (isMounted) setError('Não foi possível carregar a comparação dos meses selecionados');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchComparison();
    return () => {
      isMounted = false;
    };
  }, [month1, month2]);

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="text-primary-600" size={20} />
            <h2 className="text-base font-semibold text-gray-900">Comparativo de Gastos entre Meses</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Compare a evolução das suas despesas entre dois períodos</p>
        </div>

        {/* Seletores de meses */}
        <div className="flex flex-wrap items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar size={15} className="text-gray-400" />
            <select
              className="rounded-md border-gray-300 text-xs font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 border bg-white"
              value={month1}
              onChange={(e) => setMonth1(e.target.value)}
            >
              {monthOptions.map((opt) => (
                <option key={`m1-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-gray-400 font-semibold">vs</span>

          <div className="flex items-center gap-1.5">
            <select
              className="rounded-md border-gray-300 text-xs font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 border bg-white"
              value={month2}
              onChange={(e) => setMonth2(e.target.value)}
            >
              {monthOptions.map((opt) => (
                <option key={`m2-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          Calculando comparação entre os meses...
        </div>
      ) : error || !data ? (
        <p className="py-6 text-center text-sm text-red-500">{error ?? 'Nenhum dado disponível para o período.'}</p>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3.5">
              <span className="text-xs font-medium text-blue-800">{data.month1.label}</span>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(data.month1.totalExpense)}</p>
              <span className="text-[11px] text-blue-600">Total de despesas</span>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
              <span className="text-xs font-medium text-slate-700">{data.month2.label}</span>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(data.month2.totalExpense)}</p>
              <span className="text-[11px] text-slate-500">Total de despesas</span>
            </div>

            <div
              className={`rounded-lg border p-3.5 ${
                data.difference < 0
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : data.difference > 0
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                  : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Variação Geral</span>
                {data.difference < 0 ? (
                  <span className="flex items-center text-xs font-semibold text-emerald-700">
                    <TrendingDown size={15} className="mr-1" /> Economia
                  </span>
                ) : data.difference > 0 ? (
                  <span className="flex items-center text-xs font-semibold text-rose-700">
                    <TrendingUp size={15} className="mr-1" /> Aumento
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-semibold text-gray-600">
                    <Minus size={15} className="mr-1" /> Estável
                  </span>
                )}
              </div>
              <p className="mt-1 text-lg font-bold">
                {data.difference > 0 ? '+' : ''}
                {formatCurrency(data.difference)}
              </p>
              <span className="text-[11px] font-medium opacity-80">
                {data.difference > 0 ? '+' : ''}
                {data.percentageChange}% em relação a {data.month2.label}
              </span>
            </div>
          </div>

          {/* Gráfico comparativo de barras lado a lado */}
          {data.categories.length > 0 && (
            <div className="mt-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Comparação de Gastos por Categoria
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categories} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis
                      tickFormatter={(val: number) => {
                        if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                        return `R$ ${val}`;
                      }}
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 12 }}
                    />
                    <Legend />
                    <Bar dataKey="month1Amount" name={data.month1.label} fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="month2Amount" name={data.month2.label} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabela comparativa detalhada */}
          {data.categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Nenhuma despesa registrada nos dois meses selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-2">Categoria</th>
                    <th className="pb-2 text-right">{data.month1.label}</th>
                    <th className="pb-2 text-right">{data.month2.label}</th>
                    <th className="pb-2 text-right">Diferença</th>
                    <th className="pb-2 text-right">Variação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.categories.map((item) => {
                    const isReduction = item.difference < 0;
                    const isIncrease = item.difference > 0;

                    return (
                      <tr key={item.categoryId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.categoryColor }}
                            />
                            <span className="font-medium text-gray-800">{item.categoryName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">
                          {formatCurrency(item.month1Amount)}
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {formatCurrency(item.month2Amount)}
                        </td>
                        <td
                          className={`py-2.5 text-right font-medium ${
                            isReduction ? 'text-emerald-600' : isIncrease ? 'text-rose-600' : 'text-gray-500'
                          }`}
                        >
                          {isIncrease ? '+' : ''}
                          {formatCurrency(item.difference)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isReduction
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : isIncrease
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isReduction && <TrendingDown size={12} />}
                            {isIncrease && <TrendingUp size={12} />}
                            {isIncrease ? '+' : ''}
                            {item.percentageChange}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
