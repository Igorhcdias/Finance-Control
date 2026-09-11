import { expect, it, vi } from 'vitest';
import { investmentSchema } from '../dto/investment.dto';
import { InvestmentService } from './investment.service';
import { InvestmentRepository } from '../repositories/investment.repository';
vi.mock('../config/prisma', () => ({
  prisma: { investment: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() } },
}));
import { prisma } from '../config/prisma';
const input = { description: 'Reserva', amount: 10.25, date: '2026-09-11' };

it.each([0, -1, 1.001, Infinity, 10000000000])('rejects invalid amount %s', amount => {
  expect(investmentSchema.safeParse({ ...input, amount }).success).toBe(false);
});
it.each(['2026-02-29', '2026-09-31', 'invalid'])('rejects invalid date %s', date => {
  expect(investmentSchema.safeParse({ ...input, date }).success).toBe(false);
});
it('accepts future reservations and leap days', () => {
  expect(investmentSchema.safeParse({ ...input, date: '2028-02-29' }).success).toBe(true);
});
it('scopes all reads and mutations to the authenticated user in the independent table', async () => {
  const repo = new InvestmentRepository();
  await repo.list('owner');
  await repo.create('owner', input);
  await repo.update('owner', 'record', input);
  await repo.delete('owner', 'record');
  expect(prisma.investment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner' } }));
  expect(prisma.investment.create).toHaveBeenCalledWith({ data: { ...input, userId: 'owner', date: new Date('2026-09-11T00:00:00Z') } });
  expect(prisma.investment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'record', userId: 'owner' } }));
  expect(prisma.investment.deleteMany).toHaveBeenCalledWith({ where: { id: 'record', userId: 'owner' } });
});
it('rejects edits and deletion of missing or other users records', async () => {
  vi.mocked(prisma.investment.updateMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.investment.deleteMany).mockResolvedValue({ count: 0 });
  const service = new InvestmentService(new InvestmentRepository());
  await expect(service.update('other', 'record', input)).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.delete('other', 'record')).rejects.toMatchObject({ statusCode: 404 });
});
