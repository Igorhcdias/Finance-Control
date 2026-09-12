import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionService } from './transaction.service';
import { ICategoryRepository, ITransactionRepository } from '../interfaces/repositories';

describe('budget warnings when saving transactions', () => {
  const input = {
    description: 'Mercado', amount: 60, type: 'EXPENSE' as const,
    date: new Date('2026-08-31T00:00:00Z'), categoryId: 'food',
  };
  const saved = { ...input, id: 'transaction-1', userId: 'user-1' };
  const repository = {
    create: vi.fn(), update: vi.fn(), findById: vi.fn(), getBudgetProgress: vi.fn(),
  };
  const categories = { findById: vi.fn() };
  const service = new TransactionService(
    repository as unknown as ITransactionRepository,
    categories as unknown as ICategoryRepository
  );

  beforeEach(() => {
    vi.resetAllMocks();
    categories.findById.mockResolvedValue({ id: 'food' });
    repository.create.mockResolvedValue(saved);
    repository.update.mockResolvedValue(saved);
    repository.findById.mockResolvedValue(saved);
    repository.getBudgetProgress.mockResolvedValue([
      { categoryId: 'food', categoryName: 'Alimentação', budgetLimit: 100, amountSpent: 120 },
    ]);
  });

  it('saves expenses above the limit and returns an advisory for the transaction month', async () => {
    const result = await service.create('user-1', input);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: saved.id, budgetWarning: expect.stringContaining('foi ultrapassado') });
    expect(repository.getBudgetProgress).toHaveBeenCalledWith(
      'user-1', new Date('2026-08-01T00:00:00Z'), new Date('2026-08-31T23:59:59.999Z')
    );
  });

  it('also warns after updating an expense', async () => {
    expect(await service.update('user-1', saved.id, { amount: 60 }))
      .toMatchObject({ id: saved.id, budgetWarning: expect.stringContaining('foi ultrapassado') });
    expect(repository.update).toHaveBeenCalledWith(saved.id, { amount: 60 });
  });

  it.each(['DEBIT', 'CREDIT'] as const)('persists %s when creating an expense', async (paymentMethod) => {
    await service.create('user-1', { ...input, paymentMethod });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod }));
  });

  it('updates the payment method of an existing expense', async () => {
    await service.update('user-1', saved.id, { paymentMethod: 'CREDIT' });
    expect(repository.update).toHaveBeenCalledWith(saved.id, { paymentMethod: 'CREDIT' });
  });

  it('clears the payment method when an expense becomes income', async () => {
    await service.update('user-1', saved.id, { type: 'INCOME' });
    expect(repository.update).toHaveBeenCalledWith(saved.id, { type: 'INCOME', paymentMethod: null });
  });

  it.each([90, 100])('does not warn when spending is %s for a limit of 100', async (amountSpent) => {
    repository.getBudgetProgress.mockResolvedValue([{ categoryId: 'food', budgetLimit: 100, amountSpent }]);
    expect(await service.create('user-1', input)).not.toHaveProperty('budgetWarning');
  });

  it('does not warn for categories without a budget', async () => {
    repository.getBudgetProgress.mockResolvedValue([]);
    expect(await service.create('user-1', input)).not.toHaveProperty('budgetWarning');
  });

  it('does not check expenses for income transactions', async () => {
    repository.create.mockResolvedValue({ ...saved, type: 'INCOME' });
    expect(await service.create('user-1', { ...input, type: 'INCOME' })).not.toHaveProperty('budgetWarning');
    expect(repository.getBudgetProgress).not.toHaveBeenCalled();
  });

  it('still returns the saved transaction if the budget query fails', async () => {
    repository.getBudgetProgress.mockRejectedValue(new Error('Database unavailable'));
    expect(await service.create('user-1', input)).toMatchObject({
      id: saved.id, budgetWarning: expect.stringContaining('Não foi possível consultar'),
    });
    expect(repository.create).toHaveBeenCalledOnce();
  });
});
