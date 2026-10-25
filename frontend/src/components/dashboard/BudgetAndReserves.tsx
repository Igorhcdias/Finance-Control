import { ArrowUpRight, PiggyBank, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummary } from '../../types';
import { formatCurrency } from '../../utils/format';

interface BudgetAndReservesProps {
  summary: DashboardSummary;
}

const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function BudgetAndReserves({ summary }: BudgetAndReservesProps) {
  const month = summary.budgetPeriod?.startDate
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(summary.budgetPeriod.startDate))
    : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="card min-w-0 lg:col-span-2" aria-labelledby="budget-progress-heading">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 id="budget-progress-heading" className="flex items-center gap-2 text-base font-semibold text-gray-900"><Target size={19} className="shrink-0 text-primary-600" aria-hidden="true" />Orçamentos por categoria</h2>
          <Link to="/categorias" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Configurar <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-gray-500">
          {month ? `Mês completo de ${month}. Limites mensais comparados às despesas desse mês.` : 'Limites mensais comparados às despesas do período selecionado.'}
          {month && ' Usa o mês da data final do filtro.'}
        </p>

        {!summary.budgetProgress?.length ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-gray-700">Nenhum orçamento configurado</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">Defina um limite mensal nas categorias para acompanhar sua utilização.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {summary.budgetProgress.map((item) => {
              const exceeded = item.amountSpent > item.budgetLimit;
              const status = item.status === 'exceeded'
                ? { label: exceeded ? 'Limite ultrapassado' : 'Limite atingido', text: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-50 text-red-700' }
                : item.status === 'warning'
                  ? { label: 'Próximo do limite', text: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800' }
                  : { label: 'Dentro do orçamento', text: 'text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' };

              return (
                <li key={item.categoryId} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-medium text-gray-800">{item.categoryName?.trim() || 'Sem categoria'}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.badge}`}>{status.label}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 break-words text-gray-500"><strong className="font-semibold tabular-nums text-gray-800">{formatCurrency(Number(item.amountSpent))}</strong> de {formatCurrency(Number(item.budgetLimit))}</span>
                    <span className={`font-semibold tabular-nums ${status.text}`}>{percentFormatter.format(item.spentPercentage)}% utilizado</span>
                  </div>
                  <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Math.max(0, Math.min(item.spentPercentage, 100))}%` }} /></div>
                  <p className={`mt-2 break-words text-xs ${exceeded ? 'text-red-600' : 'text-gray-500'}`}>
                    {exceeded ? `Excedido: ${formatCurrency(item.amountSpent - item.budgetLimit)}` : `Disponível no orçamento: ${formatCurrency(item.budgetLimit - item.amountSpent)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card flex min-w-0 flex-col self-start" aria-labelledby="reserves-heading">
        <h2 id="reserves-heading" className="flex items-center gap-2 text-base font-semibold text-gray-900"><PiggyBank size={19} className="shrink-0 text-primary-600" aria-hidden="true" />Reservas financeiras</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">Acumulado de todos os períodos</p>
        {summary.reserves ? (
          <>
            <p className="mt-5 break-words text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{formatCurrency(Number(summary.reserves.totalAmount))}</p>
            <p className="mt-2 text-xs text-gray-500">{summary.reserves.count} reserva{summary.reserves.count === 1 ? '' : 's'} cadastrada{summary.reserves.count === 1 ? '' : 's'}</p>
            <p className="mt-4 text-xs leading-relaxed text-gray-500">{summary.reserves.count === 0 ? 'Cadastre uma reserva para acompanhar o dinheiro que pretende separar.' : 'Valores cadastrados para separar. O resultado do período considera apenas receitas e despesas.'}</p>
          </>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-gray-500">O resumo de reservas está indisponível. Consulte suas reservas cadastradas.</p>
        )}
        <Link to="/investimento" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Ver reservas <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
