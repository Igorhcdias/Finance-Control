import { ArrowDownLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface RecentTransactionsProps {
  transactions: Transaction[];
  periodLabel: string;
}

export function RecentTransactions({ transactions, periodLabel }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 5);

  return (
    <section className="card min-w-0" aria-labelledby="recent-transactions-heading">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="recent-transactions-heading" className="text-base font-semibold text-gray-900">Últimos lançamentos</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{periodLabel} · Até 5 lançamentos mais recentes</p>
        </div>
        <details className="group w-full sm:w-auto">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-end gap-1.5 rounded-lg px-2 text-sm font-medium text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
            Ver todos <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-wrap justify-end gap-2 pb-2">
            <Link to="/receitas" className="btn-secondary min-h-11 text-xs">Receitas</Link>
            <Link to="/despesas" className="btn-secondary min-h-11 text-xs">Despesas</Link>
          </div>
        </details>
      </div>

      {recent.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Nenhum lançamento neste período.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {recent.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
            const dateIsValid = transaction.date && !Number.isNaN(Date.parse(transaction.date));

            return (
              <li key={transaction.id} className="flex min-w-0 gap-3 py-4">
                <span aria-hidden="true" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}><Icon size={18} /></span>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-gray-900">{transaction.description?.trim() || 'Sem descrição'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span className="min-w-0 break-words">{transaction.category?.name?.trim() || 'Sem categoria'}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={dateIsValid ? transaction.date : undefined}>{dateIsValid ? formatDate(transaction.date) : 'Data não informada'}</time>
                    </div>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className={`break-words text-sm font-semibold tabular-nums ${isIncome ? 'text-emerald-700' : 'text-red-600'}`}>{isIncome ? '+' : '−'} {formatCurrency(Number(transaction.amount))}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{isIncome ? 'Receita' : 'Despesa'}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
