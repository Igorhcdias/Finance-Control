import { prisma } from '../config/prisma';
import { ICreateUserData, IUpdateUserData, IUserRepository } from '../interfaces/repositories';

/**
 * Repository Pattern: encapsula todo acesso à tabela `users`.
 * A camada de Service nunca importa o Prisma diretamente — ela só conhece
 * a interface `IUserRepository`. Isso isola o "como" os dados são
 * persistidos do "o quê" a regra de negócio precisa fazer.
 */
export class UserRepository implements IUserRepository {
  async create(data: ICreateUserData) {
    return prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: IUpdateUserData) {
    return prisma.user.update({ where: { id }, data });
  }
}
