import { Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
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
  const { summary, chart, isLoading, error } = useDashboardData();

  if (isLoading) return <Loading label="Carregando seu dashboard..." />;

  if (error || !summary) {
    return <p className="text-sm text-red-600">{error ?? 'Nenhum dado disponível.'}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Saldo atual" value={formatCurrency(summary.balance)} icon={<Wallet size={20} />} tone="neutral" />
        <MetricCard label="Receitas do mês" value={formatCurrency(summary.monthlyIncome)} icon={<TrendingUp size={20} />} tone="positive" />
        <MetricCard label="Despesas do mês" value={formatCurrency(summary.monthlyExpense)} icon={<TrendingDown size={20} />} tone="negative" />
        <MetricCard
          label="Total do mês"
          value={formatCurrency(summary.monthlyTotal)}
          icon={<Scale size={20} />}
          tone={summary.monthlyTotal >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Receitas x Despesas (últimos 6 meses)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
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
