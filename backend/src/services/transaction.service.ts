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

    return this.transactionRepository.create({
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: data.date,
      categoryId: data.categoryId,
      userId,
    });
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

    return this.transactionRepository.update(transactionId, data);
  }

  async delete(userId: string, transactionId: string) {
    await this.getOwnedTransactionOrFail(userId, transactionId);
    await this.transactionRepository.delete(transactionId);
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
