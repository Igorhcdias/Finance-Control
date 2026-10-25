import type { CategoryExpense } from '../../types';
import { formatCurrency } from '../../utils/format';

interface CategoryExpensesProps {
  categories: CategoryExpense[];
  periodLabel: string;
}

const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function CategoryExpenses({ categories, periodLabel }: CategoryExpensesProps) {
  return (
    <section className="card min-w-0" aria-labelledby="category-expenses-heading">
      <h2 id="category-expenses-heading" className="text-base font-semibold text-gray-900">Despesas por categoria</h2>
      <p className="mb-5 mt-1 text-xs leading-relaxed text-gray-500">{periodLabel} · Participação nas despesas</p>

      {categories.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 text-center">
          <p className="text-sm font-medium text-gray-700">Nenhuma despesa neste período</p>
          <p className="max-w-sm text-xs leading-relaxed text-gray-500">A distribuição por categoria aparecerá quando houver despesas registradas.</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {categories.map((category, index) => {
            const percentage = Number.isFinite(category.percentage) ? category.percentage : 0;
            const color = category.categoryColor || '#64748b';

            return (
              <li key={category.categoryId || `uncategorized-${index}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                  <span className="flex min-w-0 max-w-full items-start gap-2 text-sm font-medium text-gray-700">
                    <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 break-words">{category.categoryName?.trim() || 'Sem categoria'}</span>
                  </span>
                  <span className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 text-right">
                    <strong className="break-words text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(Number(category.amount))}</strong>
                    <span className="text-xs tabular-nums text-gray-500">{percentFormatter.format(percentage)}%</span>
                  </span>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(percentage, 100))}%`, backgroundColor: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
