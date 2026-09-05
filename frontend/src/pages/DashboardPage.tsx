import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Scale, PieChart, Target } from 'lucide-react';
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
import { MetricCard } from '../components/MetricCard';
import { Loading } from '../components/Loading';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate } from '../utils/format';

export function DashboardPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const filterStart = startDate ? new Date(startDate).toISOString() : undefined;
  const filterEnd = endDate ? new Date(endDate).toISOString() : undefined;

  const { summary, chart, isLoading, error } = useDashboardData(filterStart, filterEnd);

  if (isLoading) return <Loading label="Carregando seu dashboard..." />;

  if (error || !summary) {
    return <p className="text-sm text-red-600">{error ?? 'Nenhum dado disponível.'}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral das suas finanças</p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">De:</label>
            <input 
              type="date" 
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 px-2 py-1 border"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Até:</label>
            <input 
              type="date" 
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 px-2 py-1 border"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Saldo atual" value={formatCurrency(summary.balance)} icon={<Wallet size={20} />} tone="neutral" />
        <MetricCard label="Receitas do período" value={formatCurrency(summary.periodIncome)} icon={<TrendingUp size={20} />} tone="positive" />
        <MetricCard label="Despesas do período" value={formatCurrency(summary.periodExpense)} icon={<TrendingDown size={20} />} tone="negative" />
        <MetricCard
          label="Total do período"
          value={formatCurrency(summary.periodTotal)}
          icon={<Scale size={20} />}
          tone={summary.periodTotal >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Receitas x Despesas (período selecionado)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 13 }}
              />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="text-primary-600" size={20} />
            <h2 className="text-base font-semibold text-gray-900">Gastos por categoria</h2>
          </div>
          {summary.expensesByCategory && summary.expensesByCategory.length > 0 && (
            <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              Total: {formatCurrency(summary.periodExpense)}
            </span>
          )}
        </div>

        {!summary.expensesByCategory || summary.expensesByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
              <PieChart size={24} />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum gasto registrado neste período</p>
            <p className="text-xs text-gray-400 mt-1">As despesas adicionadas com categorias aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.expensesByCategory.map((cat) => (
              <div key={cat.categoryId} className="group rounded-lg p-2.5 transition-colors hover:bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                    <span className="font-medium text-gray-800">{cat.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
                    <span className="inline-block w-14 text-right text-xs font-medium text-gray-500">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Barra de progresso proporcional */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(cat.percentage, 100)}%`,
                      backgroundColor: cat.categoryColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acompanhamento de Orçamento */}
      <div className="card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Target className="text-primary-600" size={20} />
            <h2 className="text-base font-semibold text-gray-900">Acompanhamento de Orçamento por Categoria</h2>
          </div>
          {summary.budgetProgress && summary.budgetProgress.length > 0 && (
            <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              {summary.budgetProgress.length} categoria{summary.budgetProgress.length > 1 ? 's' : ''} com meta
            </span>
          )}
        </div>

        {/* Legenda dos indicadores de cor conforme padrão */}
        <div className="mb-5 flex flex-wrap items-center gap-4 sm:gap-6 rounded-lg bg-gray-900 text-white px-3.5 py-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm" />
            <span>0–79% → normal</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm" />
            <span>80–99% → próximo do limite</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="h-3 w-3 rounded-full bg-red-500 shadow-sm" />
            <span>100%+ → orçamento ultrapassado</span>
          </div>
        </div>

        {!summary.budgetProgress || summary.budgetProgress.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
              <Target size={24} />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum limite de orçamento configurado</p>
            <p className="text-xs text-gray-400 mt-1 mb-3">
              Defina limites mensais para suas categorias para acompanhar o consumo do orçamento aqui.
            </p>
            <Link to="/categories" className="btn-secondary text-xs py-1.5 px-3">
              Configurar categorias
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.budgetProgress.map((item) => {
              const statusConfig = {
                normal: {
                  dot: 'bg-emerald-500 ring-emerald-100',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  bar: 'bg-emerald-500',
                  label: 'Normal',
                },
                warning: {
                  dot: 'bg-amber-400 ring-amber-100',
                  badge: 'bg-amber-50 text-amber-700 border-amber-200',
                  bar: 'bg-amber-400',
                  label: 'Próximo do limite',
                },
                exceeded: {
                  dot: 'bg-red-500 ring-red-100',
                  badge: 'bg-red-50 text-red-700 border-red-200',
                  bar: 'bg-red-500',
                  label: 'Orçamento ultrapassado',
                },
              }[item.status];

              return (
                <div
                  key={item.categoryId}
                  className="rounded-lg border border-gray-100 p-3.5 transition-all hover:border-gray-200 hover:shadow-sm bg-white"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full ring-4 shadow-sm flex-shrink-0 ${statusConfig.dot}`} />
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.categoryColor }}
                        />
                        <span className="font-semibold text-gray-900 text-sm">{item.categoryName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        <strong className="text-gray-900">{formatCurrency(item.amountSpent)}</strong> de{' '}
                        {formatCurrency(item.budgetLimit)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badge}`}
                      >
                        {item.spentPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso com a cor do indicador */}
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusConfig.bar}`}
                      style={{ width: `${Math.min(item.spentPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Últimas movimentações</h2>
        {summary.recentTransactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-800">{transaction.description}</td>
                    <td className="py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}
                      >
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">{formatDate(transaction.date)}</td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
  }
