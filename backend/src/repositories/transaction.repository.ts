import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
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
