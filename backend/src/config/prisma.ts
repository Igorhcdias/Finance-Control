import { PrismaClient } from '@prisma/client';

/**
 * Singleton do PrismaClient.
 * Por quê: cada instância do PrismaClient abre um pool de conexões com o banco.
 * Reaproveitar uma única instância em toda a aplicação evita esgotar conexões
 * e é a prática recomendada oficialmente pela documentação do Prisma.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
