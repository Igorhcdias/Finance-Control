import { ICategoryRepository } from '../interfaces/repositories';
import { CreateCategoryDTO, UpdateCategoryDTO } from '../dto/category.dto';
import { AppError } from '../utils/AppError';

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async create(userId: string, data: CreateCategoryDTO) {
    const existing = await this.categoryRepository.findByName(userId, data.name);
    if (existing) {
      throw new AppError('Você já possui uma categoria com esse nome', 409);
    }
    return this.categoryRepository.create({ ...data, userId });
  }

  async listByUser(userId: string) {
    return this.categoryRepository.findAllByUser(userId);
  }

  async update(userId: string, categoryId: string, data: UpdateCategoryDTO) {
    const category = await this.getOwnedCategoryOrFail(userId, categoryId);

    if (data.name && data.name !== category.name) {
      const existing = await this.categoryRepository.findByName(userId, data.name);
      if (existing) {
        throw new AppError('Você já possui uma categoria com esse nome', 409);
      }
    }

    return this.categoryRepository.update(categoryId, data);
  }

  async delete(userId: string, categoryId: string) {
    await this.getOwnedCategoryOrFail(userId, categoryId);

    // RN04: categoria com transações vinculadas não pode ser excluída.
    const transactionsCount = await this.categoryRepository.countTransactions(categoryId);
    if (transactionsCount > 0) {
      throw new AppError(
        'Esta categoria possui transações vinculadas e não pode ser excluída',
        409
      );
    }

    await this.categoryRepository.delete(categoryId);
  }

  private async getOwnedCategoryOrFail(userId: string, categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId, userId);
    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }
    return category;
  }
}
