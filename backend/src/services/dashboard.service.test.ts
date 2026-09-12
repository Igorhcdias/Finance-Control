import { afterEach, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';
import { ICategoryExpense, ITransactionRepository } from '../interfaces/repositories';

afterEach(() => vi.useRealTimers());

const expense = (categoryId: string, amount: number): ICategoryExpense => ({
  categoryId, categoryName: categoryId, categoryColor: '#123456', amount, percentage: 0,
});

function comparisonService(first: ICategoryExpense[] = [], second: ICategoryExpense[] = []) {
  const sumExpensesByCategory = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  const service = new DashboardService({ sumExpensesByCategory } as unknown as ITransactionRepository, { sumByUser: vi.fn().mockResolvedValue(0) });
  return { service, sumExpensesByCategory };
}

it('compares complete UTC months, including leap day, with totals matching category rows', async () => {
  const { service, sumExpensesByCategory } = comparisonService(
    [expense('food', 150.3), expense('travel', 50.1)],
    [expense('food', 100.2), expense('rent', 20.2)]
  );
  const result = await service.compareMonths('user-1', '2024-02', '2024-01');
  expect(sumExpensesByCategory).toHaveBeenNthCalledWith(1, 'user-1',
    new Date('2024-02-01T00:00:00Z'), new Date('2024-02-29T23:59:59.999Z'));
  expect(sumExpensesByCategory).toHaveBeenNthCalledWith(2, 'user-1',
    new Date('2024-01-01T00:00:00Z'), new Date('2024-01-31T23:59:59.999Z'));
  expect(result.month1).toMatchObject({ totalExpense: 200.4, label: 'Fevereiro de 2024' });
  expect(result.month2.totalExpense).toBe(120.4);
  expect(result.difference).toBe(80);
  expect(result.percentageChange).toBe(66.4);
  expect(result.categories).toEqual([
    expect.objectContaining({ categoryId: 'food', difference: 50.1, percentageChange: 50 }),
    expect.objectContaining({ categoryId: 'travel', month2Amount: 0, percentageChange: null }),
    expect.objectContaining({ categoryId: 'rent', month1Amount: 0, percentageChange: -100 }),
  ]);
});

it('does not invent a percentage when the reference month has no expenses', async () => {
  const { service } = comparisonService([expense('food', 10)]);
  const result = await service.compareMonths('user-1', '2026-09', '2026-08');
  expect(result.difference).toBe(10);
  expect(result.percentageChange).toBeNull();
});

it('returns zero totals and an empty list when both months have no expenses', async () => {
  const { service } = comparisonService();
  expect(await service.compareMonths('user-1', '2026-09', '2026-08')).toMatchObject({
    month1: { totalExpense: 0 }, month2: { totalExpense: 0 },
    difference: 0, percentageChange: 0, categories: [],
  });
});

it('returns a 100 percent reduction when only the reference month has expenses', async () => {
  const { service } = comparisonService([], [expense('food', 100)]);
  expect(await service.compareMonths('user-1', '2026-09', '2026-08'))
    .toMatchObject({ difference: -100, percentageChange: -100 });
});

it('compares the same month without a difference', async () => {
  const { service } = comparisonService([expense('food', 100)], [expense('food', 100)]);
  expect(await service.compareMonths('user-1', '2026-09', '2026-09'))
    .toMatchObject({ difference: 0, percentageChange: 0 });
});

it.each(['2026-00', '2026-13', '2026-9', 'invalid', ''])('rejects invalid month %s', async (month) => {
  const { service, sumExpensesByCategory } = comparisonService();
  await expect(service.compareMonths('user-1', month, '2026-08')).rejects.toMatchObject({ statusCode: 400 });
  expect(sumExpensesByCategory).not.toHaveBeenCalled();
});

it('defaults to January and December across the year boundary', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  const { service } = comparisonService();
  expect(await service.compareMonths('user-1')).toMatchObject({
    month1: { yearMonth: '2026-01' }, month2: { yearMonth: '2025-12' },
  });
});

it('uses the entire current UTC month for category expenses, budgets and totals', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  const repository = {
    sumByType: vi.fn().mockResolvedValue(0),
    findRecentByUser: vi.fn().mockResolvedValue([]),
    sumExpensesByCategory: vi.fn().mockResolvedValue([]),
    getBudgetProgress: vi.fn().mockResolvedValue([]),
    sumExpensesByPaymentMethod: vi.fn().mockResolvedValue({ debit: 0, credit: 0, unspecified: 0 }),
  };
  await new DashboardService(repository as unknown as ITransactionRepository, { sumByUser: vi.fn().mockResolvedValue(0) }).getSummary('user-1');
  const start = new Date('2026-09-01T00:00:00.000Z');
  const end = new Date('2026-09-30T23:59:59.999Z');
  expect(repository.sumExpensesByCategory).toHaveBeenCalledWith('user-1', start, end);
  expect(repository.getBudgetProgress).toHaveBeenCalledWith('user-1', start, end);
  expect(repository.sumExpensesByPaymentMethod).toHaveBeenCalledWith('user-1', start, end);
  expect(repository.sumByType).toHaveBeenCalledWith('user-1', 'EXPENSE', start, end);
});

it('deducts current investment reserves from the all-time balance after creation, editing and deletion', async () => {
  const repository = {
    sumByType: vi.fn().mockImplementation(async (_user, type, start: Date) =>
      start.getFullYear() === 2000 ? (type === 'INCOME' ? 1000.30 : 200.10) : (type === 'INCOME' ? 100 : 20)),
    findRecentByUser: vi.fn().mockResolvedValue([]),
    sumExpensesByCategory: vi.fn().mockResolvedValue([]),
    getBudgetProgress: vi.fn().mockResolvedValue([]),
    sumExpensesByPaymentMethod: vi.fn().mockResolvedValue({ debit: 5, credit: 12, unspecified: 3 }),
  };
  const investments = { sumByUser: vi.fn() };
  const service = new DashboardService(repository as unknown as ITransactionRepository, investments);
  for (const [reserved, balance] of [[0, 800.20], [100.10, 700.10], [300.20, 500], [900.20, -100], [0, 800.20]]) {
    investments.sumByUser.mockResolvedValue(reserved);
    const result = await service.getSummary('owner', new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T23:59:59Z'));
    expect(result).toMatchObject({ balance, periodIncome: 100, periodExpense: 20, periodTotal: 80 });
    expect(result.expensesByPaymentMethod).toEqual({ debit: 5, credit: 12, unspecified: 3 });
    expect(repository.sumExpensesByPaymentMethod).toHaveBeenLastCalledWith(
      'owner', new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T23:59:59Z'),
    );
    expect(investments.sumByUser).toHaveBeenLastCalledWith('owner');
  }
});
