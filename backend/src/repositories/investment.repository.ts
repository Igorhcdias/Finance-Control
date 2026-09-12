import { prisma } from '../config/prisma';
import { InvestmentInput } from '../dto/investment.dto';
export class InvestmentRepository {
  async sumByUser(userId: string) {
    const result = await prisma.investment.aggregate({ where: { userId }, _sum: { amount: true } });
    return Number(result._sum.amount ?? 0);
  }
  list(userId: string) {
    return prisma.investment.findMany({ where: { userId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
  }
  create(userId: string, data: InvestmentInput) {
    return prisma.investment.create({ data: { ...data, userId, date: new Date(data.date + 'T00:00:00.000Z') } });
  }
  update(userId: string, id: string, data: InvestmentInput) {
    return prisma.investment.updateMany({ where: { id, userId }, data: { ...data, date: new Date(data.date + 'T00:00:00.000Z') } });
  }
  delete(userId: string, id: string) {
    return prisma.investment.deleteMany({ where: { id, userId } });
  }
}
