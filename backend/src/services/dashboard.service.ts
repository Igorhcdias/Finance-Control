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

  async getSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthlyIncome, monthlyExpense, recentTransactions] = await Promise.all([
      this.transactionRepository.sumByType(userId, TransactionType.INCOME, startOfMonth, endOfMonth),
      this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, startOfMonth, endOfMonth),
      this.transactionRepository.findRecentByUser(userId, 5),
    ]);

    // Saldo total considera TODO o histórico do usuário, não só o mês (RN05).
    const totalIncome = await this.sumAllTime(userId, TransactionType.INCOME);
    const totalExpense = await this.sumAllTime(userId, TransactionType.EXPENSE);

    return {
      balance: totalIncome - totalExpense,
      monthlyIncome,
      monthlyExpense,
      monthlyTotal: monthlyIncome - monthlyExpense,
      recentTransactions,
    };
  }

  async getChartData(userId: string, months = 6) {
    const now = new Date();
    const chart = [];

    for (let i = months - 1; i >= 0; i--) {
      const referenceDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59);

      const [income, expense] = await Promise.all([
        this.transactionRepository.sumByType(userId, TransactionType.INCOME, start, end),
        this.transactionRepository.sumByType(userId, TransactionType.EXPENSE, start, end),
      ]);

      chart.push({
        month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        income,
        expense,
      });
    }

    return chart;
  }

  private async sumAllTime(userId: string, type: TransactionType) {
    const veryOldDate = new Date(2000, 0, 1);
    const farFutureDate = new Date(2100, 0, 1);
    return this.transactionRepository.sumByType(userId, type, veryOldDate, farFutureDate);
  }
}
