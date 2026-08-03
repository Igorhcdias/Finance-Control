import { prisma } from '../config/prisma';
import {
  ICategoryRepository,
  ICreateCategoryData,
  IUpdateCategoryData,
} from '../interfaces/repositories';

export class CategoryRepository implements ICategoryRepository {
  async create(data: ICreateCategoryData) {
    return prisma.category.create({ data });
  }

  async findAllByUser(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.category.findFirst({ where: { id, userId } });
  }

  async findByName(userId: string, name: string) {
    return prisma.category.findFirst({ where: { userId, name } });
  }

  async update(id: string, data: IUpdateCategoryData) {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    await prisma.category.delete({ where: { id } });
  }

  async countTransactions(categoryId: string) {
    return prisma.transaction.count({ where: { categoryId } });
  }
}
