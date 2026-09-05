import { TransactionType } from '@prisma/client';
import {
  ICategoryComparisonItem,
  IMonthlyComparison,
  ITransactionRepository,
} from '../interfaces/repositories';

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

    const [periodIncome, periodExpense, recentTransactions, expensesByCategory, budgetProgress] = await Promise.all([
      this.transactionRepository.sumByType(userId, TransactionType.INCOME, startOfPeriod, endOfPeriod),
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, startOfPeriod, endOfPeriod),
      this.transactionRepository.findRecentByUser(userId, 5),
      this.transactionRepository.sumExpensesByCategory(userId, startOfPeriod, endOfPeriod),
      this.transactionRepository.getBudgetProgress(userId, startOfPeriod, endOfPeriod),
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
      budgetProgress,
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

  async compareMonths(
    userId: string,
    month1Str?: string,
    month2Str?: string
  ): Promise<IMonthlyComparison> {
    const parseMonth = (str?: string, defaultOffsetMonths: number = 0) => {
      if (str && /^\d{4}-\d{2}$/.test(str)) {
        const [y, m] = str.split('-').map(Number);
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        return { year: y, month: m - 1, start, end, yearMonth: str };
      }
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() - defaultOffsetMonths, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const yearMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
      return { year: y, month: m, start, end, yearMonth };
    };

    const m1 = parseMonth(month1Str, 0);
    const m2 = parseMonth(month2Str, 1);

    const [totalExpense1, totalExpense2, categories1, categories2] = await Promise.all([
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, m1.start, m1.end),
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, m2.start, m2.end),
      this.transactionRepository.sumExpensesByCategory(userId, m1.start, m1.end),
      this.transactionRepository.sumExpensesByCategory(userId, m2.start, m2.end),
    ]);

    const formatLabel = (date: Date) => {
      const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    const categoryMap = new Map<string, ICategoryComparisonItem>();

    for (const c of categories1) {
      categoryMap.set(c.categoryId, {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryColor: c.categoryColor,
        month1Amount: c.amount,
        month2Amount: 0,
        difference: c.amount,
        percentageChange: 100,
      });
    }

    for (const c of categories2) {
      const existing = categoryMap.get(c.categoryId);
      if (existing) {
        existing.month2Amount = c.amount;
        existing.difference = existing.month1Amount - c.amount;
        existing.percentageChange = c.amount > 0
          ? Number((((existing.month1Amount - c.amount) / c.amount) * 100).toFixed(1))
          : 100;
      } else {
        categoryMap.set(c.categoryId, {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryColor: c.categoryColor,
          month1Amount: 0,
          month2Amount: c.amount,
          difference: -c.amount,
          percentageChange: -100,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => Math.max(b.month1Amount, b.month2Amount) - Math.max(a.month1Amount, a.month2Amount)
    );

    const difference = totalExpense1 - totalExpense2;
    const percentageChange = totalExpense2 > 0
      ? Number((((totalExpense1 - totalExpense2) / totalExpense2) * 100).toFixed(1))
      : (totalExpense1 > 0 ? 100 : 0);

    return {
      month1: {
        yearMonth: m1.yearMonth,
        label: formatLabel(m1.start),
        totalExpense: totalExpense1,
      },
      month2: {
        yearMonth: m2.yearMonth,
        label: formatLabel(m2.start),
        totalExpense: totalExpense2,
      },
      difference,
      percentageChange,
      categories,
    };
  }

  private async sumAllTime(userId: string, type: TransactionType) {
    const veryOldDate = new Date(2000, 0, 1);
    const farFutureDate = new Date(2100, 0, 1);
    return this.transactionRepository.sumByType(userId, type, veryOldDate, farFutureDate);
  }
}
