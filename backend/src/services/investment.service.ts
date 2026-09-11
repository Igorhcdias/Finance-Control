import { InvestmentRepository } from '../repositories/investment.repository';
import { InvestmentInput } from '../dto/investment.dto';
import { AppError } from '../utils/AppError';
export class InvestmentService {
  constructor(private readonly repository: InvestmentRepository) {}
  list(userId: string) { return this.repository.list(userId); }
  create(userId: string, data: InvestmentInput) { return this.repository.create(userId, data); }
  async update(userId: string, id: string, data: InvestmentInput) {
    const result = await this.repository.update(userId, id, data);
    if (!result.count) throw new AppError('Reserva não encontrada', 404);
  }
  async delete(userId: string, id: string) {
    const result = await this.repository.delete(userId, id);
    if (!result.count) throw new AppError('Reserva não encontrada', 404);
  }
}
