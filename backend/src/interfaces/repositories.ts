import { Category, Transaction, TransactionType, User } from '@prisma/client';

/**
 * Interfaces de Repositório.
 *
 * Por que interfaces e não classes concretas diretamente?
 * - Dependency Inversion Principle (SOLID - "D"): as camadas de Service dependem
 *   de uma abstração (interface), não de uma implementação concreta do Prisma.
 * - Isso permite trocar a fonte de dados (ex: Prisma -> outro ORM, ou mocks em
 *   testes unitários) sem alterar uma linha sequer da camada de Service.
 */

export interface ICreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export interface IUpdateUserData {
  name?: string;
  email?: string;
  passwordHash?: string;
}

export interface IUserRepository {
  create(data: ICreateUserData): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: IUpdateUserData): Promise<User>;
}

export interface ICreateCategoryData {
  name: string;
  color: string;
  userId: string;
}

export interface IUpdateCategoryData {
  name?: string;
  color?: string;
}

export interface ICategoryRepository {
  create(data: ICreateCategoryData): Promise<Category>;
  findAllByUser(userId: string): Promise<Category[]>;
  findById(id: string, userId: string): Promise<Category | null>;
  findByName(userId: string, name: string): Promise<Category | null>;
  update(id: string, data: IUpdateCategoryData): Promise<Category>;
  delete(id: string): Promise<void>;
  countTransactions(categoryId: string): Promise<number>;
}

export interface ICreateTransactionData {
  description: string;
  amount: number;
  type: TransactionType;
  date: Date;
  userId: string;
  categoryId: string;
}

export interface IUpdateTransactionData {
  description?: string;
  amount?: number;
  type?: TransactionType;
  date?: Date;
  categoryId?: string;
}

export interface ITransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface ITransactionRepository {
  create(data: ICreateTransactionData): Promise<Transaction>;
  findById(id: string, userId: string): Promise<Transaction | null>;
  findAllByUser(
    userId: string,
    filters: ITransactionFilters
  ): Promise<{ items: Transaction[]; total: number }>;
  update(id: string, data: IUpdateTransactionData): Promise<Transaction>;
  delete(id: string): Promise<void>;
  sumByType(userId: string, type: TransactionType, startDate: Date, endDate: Date): Promise<number>;
  findRecentByUser(userId: string, limit: number): Promise<Transaction[]>;
  findAllForPeriod(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
}
