import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ChartPoint } from '../../types';
import { formatCurrency } from '../../utils/format';

interface FinancialEvolutionProps {
  chart: ChartPoint[];
  periodLabel: string;
}

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function EvolutionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-gray-900">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <p key={item.dataKey} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <span className="text-gray-600">{item.name}</span>
            <strong className="tabular-nums" style={{ color: item.color }}>
              {formatCurrency(Number(item.value ?? 0))}
            </strong>
          </p>
        ))}
      </div>
    </div>
  );
}

export function FinancialEvolution({ chart, periodLabel }: FinancialEvolutionProps) {
  const hasMovement = chart.some((point) => point.income !== 0 || point.expense !== 0);

  return (
    <section className="card min-w-0" aria-labelledby="financial-evolution-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="financial-evolution-heading" className="text-base font-semibold text-gray-900">Evolução financeira</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600" aria-label="Legenda do gráfico">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Receitas</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-red-500" />Despesas</span>
        </div>
      </div>

      {!hasMovement ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 text-center">
          <p className="text-sm font-medium text-gray-700">Nenhuma movimentação neste período</p>
          <p className="max-w-sm text-xs leading-relaxed text-gray-500">As receitas e despesas aparecerão aqui conforme você cadastrar seus lançamentos.</p>
        </div>
      ) : (
        <>
          <div className="h-64 min-w-0 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chart} accessibilityLayer margin={{ top: 8, right: 4, bottom: 4, left: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} interval="preserveStartEnd" />
                <YAxis tickFormatter={(value: number) => compactCurrency.format(value)} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<EvolutionTooltip />} cursor={{ fill: '#f3f4f6' }} wrapperStyle={{ maxWidth: '100%', outline: 'none' }} />
                <Bar dataKey="income" name="Receitas" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">Toque ou passe o cursor sobre o gráfico para ver os valores. Use as setas do teclado ao focar o gráfico.</p>
        </>
      )}

      {chart.length > 0 && (
        <details className="mt-4 border-t border-gray-100 pt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Ver valores do gráfico</summary>
          <ul className="divide-y divide-gray-100 text-xs">
            {chart.map((point) => (
              <li key={point.label} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-3">
                <span className="font-medium text-gray-700">{point.label}</span>
                <span className="break-words text-emerald-700">Receitas: <strong className="tabular-nums">{formatCurrency(point.income)}</strong></span>
                <span className="break-words text-red-600">Despesas: <strong className="tabular-nums">{formatCurrency(point.expense)}</strong></span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
