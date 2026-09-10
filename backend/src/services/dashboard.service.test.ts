import { afterEach, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';
import { ITransactionRepository } from '../interfaces/repositories';

afterEach(() => vi.useRealTimers());

it('uses the entire current UTC month for category expenses, budgets and totals', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  const repository = {
    sumByType: vi.fn().mockResolvedValue(0),
    findRecentByUser: vi.fn().mockResolvedValue([]),
    sumExpensesByCategory: vi.fn().mockResolvedValue([]),
    getBudgetProgress: vi.fn().mockResolvedValue([]),
  };
  await new DashboardService(repository as unknown as ITransactionRepository).getSummary('user-1');
  const start = new Date('2026-09-01T00:00:00.000Z');
  const end = new Date('2026-09-30T23:59:59.999Z');
  expect(repository.sumExpensesByCategory).toHaveBeenCalledWith('user-1', start, end);
  expect(repository.getBudgetProgress).toHaveBeenCalledWith('user-1', start, end);
  expect(repository.sumByType).toHaveBeenCalledWith('user-1', 'EXPENSE', start, end);
});
