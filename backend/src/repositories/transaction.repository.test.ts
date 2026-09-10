import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { TransactionRepository } from './transaction.repository';
import { prisma } from '../config/prisma';

vi.mock('../config/prisma', () => ({
  prisma: {
    transaction: { groupBy: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));

describe('expenses by category', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns numeric amounts and proportional percentages scoped to user, expense type and period', async () => {
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { categoryId: 'food', _sum: { amount: new Prisma.Decimal('75.30') } },
      { categoryId: 'transport', _sum: { amount: new Prisma.Decimal('25.10') } },
    ] as never);
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      { id: 'food', name: 'Alimentação', color: '#ff0000' },
      { id: 'transport', name: 'Transporte', color: '#0000ff' },
    ] as never);
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-30T23:59:59.999Z');
    const result = await new TransactionRepository().sumExpensesByCategory('user-1', start, end);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['categoryId'],
      where: { userId: 'user-1', type: 'EXPENSE', date: { gte: start, lte: end } },
      orderBy: { _sum: { amount: 'desc' } },
    }));
    expect(result).toEqual([
      { categoryId: 'food', categoryName: 'Alimentação', categoryColor: '#ff0000', amount: 75.3, percentage: 75 },
      { categoryId: 'transport', categoryName: 'Transporte', categoryColor: '#0000ff', amount: 25.1, percentage: 25 },
    ]);
  });

  it('returns an empty list for a period without expenses', async () => {
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);
    expect(await new TransactionRepository().sumExpensesByCategory('user-1', new Date(), new Date())).toEqual([]);
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });
});
