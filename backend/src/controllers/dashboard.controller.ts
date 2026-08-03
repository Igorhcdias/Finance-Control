import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { TransactionRepository } from '../repositories/transaction.repository';

const dashboardService = new DashboardService(new TransactionRepository());

export class DashboardController {
  async summary(req: Request, res: Response) {
    const summary = await dashboardService.getSummary(req.user!.id);
    res.status(200).json(summary);
  }

  async chart(req: Request, res: Response) {
    const months = req.query.months ? Number(req.query.months) : 6;
    const chart = await dashboardService.getChartData(req.user!.id, months);
    res.status(200).json(chart);
  }
}
