import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { TransactionRepository } from '../repositories/transaction.repository';

const dashboardService = new DashboardService(new TransactionRepository());

export class DashboardController {
  async summary(req: Request, res: Response) {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const summary = await dashboardService.getSummary(req.user!.id, startDate, endDate);
    res.status(200).json(summary);
  }

  async chart(req: Request, res: Response) {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const chart = await dashboardService.getChartData(req.user!.id, startDate, endDate);
    res.status(200).json(chart);
  }

  async monthlyComparison(req: Request, res: Response) {
    const month1 = req.query.month1 as string | undefined;
    const month2 = req.query.month2 as string | undefined;

    const comparison = await dashboardService.compareMonths(req.user!.id, month1, month2);
    res.status(200).json(comparison);
  }
}
