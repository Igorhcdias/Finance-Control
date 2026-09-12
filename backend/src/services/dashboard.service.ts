import { Prisma, TransactionType } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { InvestmentRepository } from '../repositories/investment.repository';
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
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly investmentRepository: Pick<InvestmentRepository, 'sumByUser'>,
  ) {}

  async getSummary(userId: string, filterStartDate?: Date, filterEndDate?: Date) {
    const now = new Date();
    // Transaction.date is a SQL DATE: use UTC calendar boundaries, independent of server timezone.
    const startOfPeriod = filterStartDate || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfPeriod = filterEndDate || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const [periodIncome, periodExpense, recentTransactions, expensesByCategory, budgetProgress, expensesByPaymentMethod] = await Promise.all([
      this.transactionRepository.sumByType(userId, TransactionType.INCOME, startOfPeriod, endOfPeriod),
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, startOfPeriod, endOfPeriod),
      this.transactionRepository.findRecentByUser(userId, 5),
      this.transactionRepository.sumExpensesByCategory(userId, startOfPeriod, endOfPeriod),
      this.transactionRepository.getBudgetProgress(userId, startOfPeriod, endOfPeriod),
      this.transactionRepository.sumExpensesByPaymentMethod(userId, startOfPeriod, endOfPeriod),
    ]);

    // Saldo total considera TODO o histórico do usuário, não só o período (RN05).
    const totalIncome = await this.sumAllTime(userId, TransactionType.INCOME);
    const totalExpense = await this.sumAllTime(userId, TransactionType.EXPENSE);
    const totalInvested = await this.investmentRepository.sumByUser(userId);

    return {
      balance: new Prisma.Decimal(totalIncome).minus(totalExpense).minus(totalInvested).toNumber(),
      periodIncome,
      periodExpense,
      periodTotal: periodIncome - periodExpense,
      recentTransactions,
      expensesByCategory,
      expensesByPaymentMethod,
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
      for (let d = new Date(filterStartDate); d <= filterEndDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
        chartData.set(label, { income: 0, expense: 0 });
      }
    } else {
      const firstMonth = new Date(Date.UTC(filterStartDate.getUTCFullYear(), filterStartDate.getUTCMonth(), 1));
      for (let d = firstMonth; d <= filterEndDate; d.setUTCMonth(d.getUTCMonth() + 1)) {
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
        if (!chartData.has(label)) {
          chartData.set(label, { income: 0, expense: 0 });
        }
      }
    }

    transactions.forEach(t => {
      const label = diffDays <= 31 
        ? t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
        : t.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });

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
      if (str !== undefined) {
        if (typeof str !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(str)) {
          throw new AppError('Informe um mês válido no formato AAAA-MM', 400);
        }
        const [y, m] = str.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        return { year: y, month: m - 1, start, end, yearMonth: str };
      }
      const now = new Date();
      const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - defaultOffsetMonths, 1));
      const y = targetDate.getUTCFullYear();
      const m = targetDate.getUTCMonth();
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      const yearMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
      return { year: y, month: m, start, end, yearMonth };
    };

    const m1 = parseMonth(month1Str, 0);
    const m2 = parseMonth(month2Str, 1);

    const [categories1, categories2] = await Promise.all([
      this.transactionRepository.sumExpensesByCategory(userId, m1.start, m1.end),
      this.transactionRepository.sumExpensesByCategory(userId, m2.start, m2.end),
    ]);

    const formatLabel = (date: Date) => {
      const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
        percentageChange: c.amount > 0 ? null : 0,
      });
    }

    for (const c of categories2) {
      const existing = categoryMap.get(c.categoryId);
      if (existing) {
        existing.month2Amount = c.amount;
        existing.difference = new Prisma.Decimal(existing.month1Amount).minus(c.amount).toNumber();
        existing.percentageChange = this.percentageChange(existing.month1Amount, c.amount);
      } else {
        categoryMap.set(c.categoryId, {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryColor: c.categoryColor,
          month1Amount: 0,
          month2Amount: c.amount,
          difference: -c.amount,
          percentageChange: c.amount > 0 ? -100 : 0,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => Math.max(b.month1Amount, b.month2Amount) - Math.max(a.month1Amount, a.month2Amount)
    );

    const totalExpense1 = categories1.reduce((sum, c) => sum.plus(c.amount), new Prisma.Decimal(0)).toNumber();
    const totalExpense2 = categories2.reduce((sum, c) => sum.plus(c.amount), new Prisma.Decimal(0)).toNumber();
    const difference = new Prisma.Decimal(totalExpense1).minus(totalExpense2).toNumber();
    const percentageChange = this.percentageChange(totalExpense1, totalExpense2);

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

  private percentageChange(current: number, baseline: number): number | null {
    if (baseline === 0) return current === 0 ? 0 : null;
    return new Prisma.Decimal(current).minus(baseline).dividedBy(baseline).times(100).toDecimalPlaces(1).toNumber();
  }

  private async sumAllTime(userId: string, type: TransactionType) {
    const veryOldDate = new Date(2000, 0, 1);
    const farFutureDate = new Date(2100, 0, 1);
    return this.transactionRepository.sumByType(userId, type, veryOldDate, farFutureDate);
  }
}
