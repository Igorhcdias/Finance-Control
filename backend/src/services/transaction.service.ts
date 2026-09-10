import { ICategoryRepository, ITransactionRepository } from '../interfaces/repositories';
import {
  CreateTransactionDTO,
  TransactionQueryDTO,
  UpdateTransactionDTO,
} from '../dto/transaction.dto';
import { AppError } from '../utils/AppError';

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly categoryRepository: ICategoryRepository
  ) {}

  async create(userId: string, data: CreateTransactionDTO) {
    await this.assertCategoryBelongsToUser(userId, data.categoryId);

    const transaction = await this.transactionRepository.create({
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: data.date,
      categoryId: data.categoryId,
      userId,
    });
    return this.withBudgetWarning(userId, transaction);
  }

  async list(userId: string, query: TransactionQueryDTO) {
    const { items, total } = await this.transactionRepository.findAllByUser(userId, query);
    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async update(userId: string, transactionId: string, data: UpdateTransactionDTO) {
    await this.getOwnedTransactionOrFail(userId, transactionId);

    if (data.categoryId) {
      await this.assertCategoryBelongsToUser(userId, data.categoryId);
    }

    const transaction = await this.transactionRepository.update(transactionId, data);
    return this.withBudgetWarning(userId, transaction);
  }

  async delete(userId: string, transactionId: string) {
    await this.getOwnedTransactionOrFail(userId, transactionId);
    await this.transactionRepository.delete(transactionId);
  }

  private async withBudgetWarning(userId: string, transaction: Transaction) {
    if (transaction.type !== 'EXPENSE') return transaction;

    // Advisory only: the transaction has already been saved successfully.
    try {
      const date = transaction.date;
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const progress = await this.transactionRepository.getBudgetProgress(userId, start, end);
      const category = progress.find((item) => item.categoryId === transaction.categoryId);
      if (category && category.amountSpent > category.budgetLimit) {
        const currency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const month = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        return {
          ...transaction,
          budgetWarning: `O orçamento de ${category.categoryName} em ${month} foi ultrapassado: ${currency(category.amountSpent)} gastos para um limite de ${currency(category.budgetLimit)}.`,
        };
      }
      return transaction;
    } catch {
      return {
        ...transaction,
        budgetWarning: 'Não foi possível consultar o orçamento da categoria agora. Confira o acompanhamento no dashboard.',
      };
    }
  }

  private async getOwnedTransactionOrFail(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findById(transactionId, userId);
    if (!transaction) {
      throw new AppError('Transação não encontrada', 404);
    }
    return transaction;
  }

  private async assertCategoryBelongsToUser(userId: string, categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId, userId);
    if (!category) {
      throw new AppError('Categoria informada não existe ou não pertence a este usuário', 422);
    }
  }
}
import { Transaction } from '@prisma/client';
