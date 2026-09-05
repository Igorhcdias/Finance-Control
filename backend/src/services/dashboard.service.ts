import { TransactionType } from '@prisma/client';
import { ITransactionRepository } from '../interfaces/repositories';

/**
 * Service dedicado ao Dashboard (RF04, RF05, RF06).
 * Por que um service separado do TransactionService, se ambos leem
 * transações? Porque a responsabilidade aqui é diferente: não é "gerenciar
 * uma transação", é "agregar dados para uma visão consolidada". Manter isso
 * separado evita que o TransactionService cresça com lógica de agregação
 * que não lhe pertence (SRP).
 */
export class DashboardService {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async getSummary(userId: string, filterStartDate?: Date, filterEndDate?: Date) {
    const now = new Date();
    const startOfPeriod = filterStartDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfPeriod = filterEndDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [periodIncome, periodExpense, recentTransactions, expensesByCategory] = await Promise.all([
      this.transactionRepository.sumByType(userId, TransactionType.INCOME, startOfPeriod, endOfPeriod),
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, startOfPeriod, endOfPeriod),
      this.transactionRepository.findRecentByUser(userId, 5),
      this.transactionRepository.sumExpensesByCategory(userId, startOfPeriod, endOfPeriod),
    ]);

    // Saldo total considera TODO o histórico do usuário, não só o período (RN05).
    const totalIncome = await this.sumAllTime(userId, TransactionType.INCOME);
    const totalExpense = await this.sumAllTime(userId, TransactionType.EXPENSE);

    return {
      balance: totalIncome - totalExpense,
      periodIncome,
      periodExpense,
      periodTotal: periodIncome - periodExpense,
      recentTransactions,
      expensesByCategory,
    };
  }

  async getChartData(userId: string, filterStartDate?: Date, filterEndDate?: Date) {
    if (!filterStartDate || !filterEndDate) {
      const now = new Date();
      const chart = [];
      for (let i = 5; i >= 0; i--) {
        const referenceDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);

        const [income, expense] = await Promise.all([
          this.transactionRepository.sumByType(userId, TransactionType.INCOME, start, end),
          this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, start, end),
        ]);

        chart.push({
          label: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          income,
          expense,
        });
      }
      return chart;
    }

    const diffTime = Math.abs(filterEndDate.getTime() - filterStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const transactions = await this.transactionRepository.findAllForPeriod(userId, filterStartDate, filterEndDate);
    const chartData = new Map<string, { income: number; expense: number }>();

    // Pré-preencher mapa para garantir que todos os dias/meses apareçam
    if (diffDays <= 31) {
      for (let d = new Date(filterStartDate); d <= filterEndDate; d.setDate(d.getDate() + 1)) {
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        chartData.set(label, { income: 0, expense: 0 });
      }
    } else {
      for (let d = new Date(filterStartDate); d <= filterEndDate; d.setMonth(d.getMonth() + 1)) {
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (!chartData.has(label)) {
          chartData.set(label, { income: 0, expense: 0 });
        }
      }
    }

    transactions.forEach(t => {
      const label = diffDays <= 31 
        ? t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : t.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const existing = chartData.get(label) || { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) {
        existing.income += Number(t.amount);
      } else {
        existing.expense += Number(t.amount);
      }
      chartData.set(label, existing);
    });

    return Array.from(chartData.entries()).map(([label, data]) => ({
      label,
      income: data.income,
      expense: data.expense
    }));
  }

  private async sumAllTime(userId: string, type: TransactionType) {
    const veryOldDate = new Date(2000, 0, 1);
    const farFutureDate = new Date(2100, 0, 1);
    return this.transactionRepository.sumByType(userId, type, veryOldDate, farFutureDate);
  }
}
