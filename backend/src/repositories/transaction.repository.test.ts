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

describe('expenses by payment method', () => {
  beforeEach(() => vi.resetAllMocks());

  it('includes unclassified expenses and scopes totals to the user and selected period', async () => {
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { paymentMethod: 'DEBIT', _sum: { amount: new Prisma.Decimal('75.30') } },
      { paymentMethod: 'CREDIT', _sum: { amount: new Prisma.Decimal('20.10') } },
      { paymentMethod: null, _sum: { amount: new Prisma.Decimal('5.05') } },
    ] as never);
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-30T23:59:59.999Z');
    const result = await new TransactionRepository().sumExpensesByPaymentMethod('user-1', start, end);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
      by: ['paymentMethod'],
      where: { userId: 'user-1', type: 'EXPENSE', date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    expect(result).toEqual({ debit: 75.3, credit: 20.1, unspecified: 5.05 });
  });

  it('returns zero totals for a period with no expenses', async () => {
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([]);
    expect(await new TransactionRepository().sumExpensesByPaymentMethod('user-1', new Date(), new Date()))
      .toEqual({ debit: 0, credit: 0, unspecified: 0 });
  });

  it('returns zero for payment methods without expenses', async () => {
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { paymentMethod: 'CREDIT', _sum: { amount: new Prisma.Decimal('12.50') } },
    ] as never);
    expect(await new TransactionRepository().sumExpensesByPaymentMethod('user-1', new Date(), new Date()))
      .toEqual({ debit: 0, credit: 12.5, unspecified: 0 });
  });
});

describe('budget progress', () => {
  beforeEach(() => vi.resetAllMocks());

  it('includes budgeted categories without expenses and scopes spending to the user and period', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      { id: 'food', name: 'Alimentação', color: '#ff0000', budgetLimit: new Prisma.Decimal(100) },
      { id: 'travel', name: 'Viagens', color: '#0000ff', budgetLimit: new Prisma.Decimal(200) },
    ] as never);
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { categoryId: 'food', _sum: { amount: new Prisma.Decimal(125) } },
    ] as never);
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-30T23:59:59.999Z');
    const result = await new TransactionRepository().getBudgetProgress('user-1', start, end);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', budgetLimit: { gt: 0 } }, orderBy: { name: 'asc' },
    });
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', type: 'EXPENSE', categoryId: { in: ['food', 'travel'] }, date: { gte: start, lte: end } },
    }));
    expect(result).toEqual([
      expect.objectContaining({ categoryId: 'food', amountSpent: 125, budgetLimit: 100, spentPercentage: 125, status: 'exceeded' }),
      expect.objectContaining({ categoryId: 'travel', amountSpent: 0, budgetLimit: 200, spentPercentage: 0, status: 'normal' }),
    ]);
  });

  it.each([
    [79.99, 'normal'], [80, 'warning'], [99.99, 'warning'], [100, 'exceeded'], [120, 'exceeded'],
  ])('classifies spending of %s using the actual amount, not the rounded percentage', async (amount, status) => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([
      { id: 'food', name: 'Alimentação', color: '#ff0000', budgetLimit: new Prisma.Decimal(100) },
    ] as never);
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { categoryId: 'food', _sum: { amount: new Prisma.Decimal(amount) } },
    ] as never);
    const result = await new TransactionRepository().getBudgetProgress('user-1', new Date(), new Date());
    expect(result[0].status).toBe(status);
  });

  it('returns no progress when no category has a budget', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    expect(await new TransactionRepository().getBudgetProgress('user-1', new Date(), new Date())).toEqual([]);
    expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
  });
});

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
