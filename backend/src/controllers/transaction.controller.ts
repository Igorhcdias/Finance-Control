import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';

const transactionService = new TransactionService(
  new TransactionRepository(),
  new CategoryRepository()
);

export class TransactionController {
  async create(req: Request, res: Response) {
    const transaction = await transactionService.create(req.user!.id, req.body);
    res.status(201).json(transaction);
  }

  async list(req: Request, res: Response) {
    const result = await transactionService.list(req.user!.id, req.query as any);
    res.status(200).json(result);
  }

  async update(req: Request, res: Response) {
    const transaction = await transactionService.update(req.user!.id, req.params.id, req.body);
    res.status(200).json(transaction);
  }

  async delete(req: Request, res: Response) {
    await transactionService.delete(req.user!.id, req.params.id);
    res.status(204).send();
  }
}
