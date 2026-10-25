import { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Percent } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { PeriodFilter } from '../components/dashboard/PeriodFilter';
import { FinancialEvolution } from '../components/dashboard/FinancialEvolution';
import { CategoryExpenses } from '../components/dashboard/CategoryExpenses';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { BudgetAndReserves } from '../components/dashboard/BudgetAndReserves';
import { NewTransactionAction } from '../components/dashboard/NewTransactionAction';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate } from '../utils/format';
import { formatPercentage, getDashboardPeriod, savingsRate } from '../utils/dashboard';

export function DashboardPage() {
  const [period, setPeriod] = useState(() => getDashboardPeriod('lastSixMonths'));
  const { summary, chart, isLoading, error, refresh } = useDashboardData(period.startDate, period.endDate);
  const periodLabel = `${formatDate(period.startDate)} a ${formatDate(period.endDate)}`;
  const rate = summary ? savingsRate(summary.periodIncome, summary.periodTotal) : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Entenda seu resultado e acompanhe suas finanças.</p>
        </div>
        <NewTransactionAction onCreated={refresh} />
      </div>

      <PeriodFilter period={period} onChange={setPeriod} />

      {isLoading ? (
        <div role="status" aria-label="Carregando dados do período" className="space-y-4">
          <p className="text-sm text-gray-500">Carregando dados do período…</p>
          <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="card h-40 animate-pulse bg-gray-100 motion-reduce:animate-none" />)}
          </div>
          <div aria-hidden="true" className="card h-72 animate-pulse bg-gray-100 motion-reduce:animate-none" />
        </div>
      ) : error || !summary ? (
        <div className="card" role="alert">
          <h2 className="font-semibold text-gray-900">Não foi possível carregar a visão geral</h2>
          <p className="mt-2 text-sm text-gray-600">{error ?? 'Tente novamente para consultar este período.'}</p>
          <button type="button" onClick={refresh} className="btn-secondary mt-4 min-h-11">Tentar novamente</button>
        </div>
      ) : (
        <>
          <section aria-labelledby="financial-overview" className="min-w-0">
            <h2 id="financial-overview" className="mb-3 text-base font-semibold text-gray-900">Visão geral financeira</h2>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Receitas do período" value={formatCurrency(summary.periodIncome)} icon={<TrendingUp size={20} />} tone="positive" description="Entradas registradas no período." />
              <MetricCard label="Despesas do período" value={formatCurrency(summary.periodExpense)} icon={<TrendingDown size={20} />} tone="negative" description="Saídas registradas no período." />
              <MetricCard label="Resultado do período" value={formatCurrency(summary.periodTotal)} icon={<Scale size={20} />} tone={summary.periodTotal === 0 ? 'neutral' : summary.periodTotal > 0 ? 'positive' : 'negative'} description="Receitas menos despesas. Não representa o saldo em conta." />
              <MetricCard label="Taxa de economia" value={rate === null ? '—' : formatPercentage(rate)} icon={<Percent size={20} />} tone={rate === null || rate === 0 ? 'neutral' : rate > 0 ? 'positive' : 'negative'} description={rate === null ? 'Sem receitas no período: taxa não calculável.' : 'Resultado ÷ receitas × 100. Taxa negativa indica déficit.'} />
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
            <FinancialEvolution chart={chart} periodLabel={periodLabel} />
            <CategoryExpenses categories={summary.expensesByCategory} periodLabel={periodLabel} />
          </div>

          <RecentTransactions transactions={summary.recentTransactions} periodLabel={periodLabel} />
          <BudgetAndReserves summary={summary} />

          {summary.expensesByPaymentMethod && (
            <details className="card min-w-0">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-gray-700">Detalhes das despesas por pagamento</summary>
              <p className="mt-2 text-xs text-gray-500">Pela data da despesa · {periodLabel}</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {([
                  ['Débito', summary.expensesByPaymentMethod.debit],
                  ['Crédito', summary.expensesByPaymentMethod.credit],
                  ['Não informado', summary.expensesByPaymentMethod.unspecified],
                ] as const).map(([label, amount]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-gray-800">{formatCurrency(amount)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </>
      )}
    </div>
  );
}
