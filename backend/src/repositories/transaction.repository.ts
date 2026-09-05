import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  ICategoryBudgetProgress,
  ICategoryExpense,
  ICreateTransactionData,
  ITransactionFilters,
  ITransactionRepository,
  IUpdateTransactionData,
} from '../interfaces/repositories';

export class TransactionRepository implements ITransactionRepository {
  async create(data: ICreateTransactionData) {
    return prisma.transaction.create({ data, include: { category: true } });
  }

  async findById(id: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  async findAllByUser(userId: string, filters: ITransactionFilters) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: filters.type,
      categoryId: filters.categoryId,
      description: filters.search
        ? { contains: filters.search, mode: 'insensitive' }
        : undefined,
      date:
        filters.startDate || filters.endDate
          ? { gte: filters.startDate, lte: filters.endDate }
          : undefined,
    };

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: IUpdateTransactionData) {
    return prisma.transaction.update({ where: { id }, data, include: { category: true } });
  }

  async delete(id: string) {
    await prisma.transaction.delete({ where: { id } });
  }

  async sumByType(userId: string, type: TransactionType, startDate: Date, endDate: Date) {
    const result = await prisma.transaction.aggregate({
      where: { userId, type, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async sumExpensesByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ICategoryExpense[]> {
    const grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    if (grouped.length === 0) return [];

    const categories = await prisma.category.findMany({
      where: {
        id: { in: grouped.map((g) => g.categoryId) },
      },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const totalExpense = grouped.reduce((acc, g) => acc + Number(g._sum.amount ?? 0), 0);

    return grouped.map((g) => {
      const category = categoryMap.get(g.categoryId);
      const amount = Number(g._sum.amount ?? 0);
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;

      return {
        categoryId: g.categoryId,
        categoryName: category?.name ?? 'Outros',
        categoryColor: category?.color ?? '#9ca3af',
        amount,
        percentage: Number(percentage.toFixed(1)),
      };
    });
  }

  async getBudgetProgress(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ICategoryBudgetProgress[]> {
    const categoriesWithBudget = await prisma.category.findMany({
      where: {
        userId,
        budgetLimit: { not: null },
      },
      orderBy: { name: 'asc' },
    });

    if (categoriesWithBudget.length === 0) return [];

    const categoryIds = categoriesWithBudget.map((c) => c.id);
    const expenses = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: { in: categoryIds },
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
    });

    const expenseMap = new Map<string, number>();
    for (const exp of expenses) {
      expenseMap.set(exp.categoryId, Number(exp._sum.amount ?? 0));
    }

    return categoriesWithBudget.map((category) => {
      const budgetLimit = Number(category.budgetLimit);
      const amountSpent = expenseMap.get(category.id) ?? 0;
      const spentPercentage = budgetLimit > 0 ? Number(((amountSpent / budgetLimit) * 100).toFixed(1)) : 0;

      let status: 'normal' | 'warning' | 'exceeded' = 'normal';
      if (spentPercentage >= 100) {
        status = 'exceeded';
      } else if (spentPercentage >= 80) {
        status = 'warning';
      }

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        budgetLimit,
        amountSpent,
        spentPercentage,
        status,
      };
    });
  }

  async findRecentByUser(userId: string, limit: number) {
    return prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findAllForPeriod(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });
  }
}
