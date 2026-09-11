import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { investmentSchema } from '../dto/investment.dto';
import { InvestmentRepository } from '../repositories/investment.repository';
import { InvestmentService } from '../services/investment.service';
const router = Router();
const service = new InvestmentService(new InvestmentRepository());
router.use(authMiddleware);
router.get('/', asyncHandler(async (req, res) => { res.json(await service.list(req.user!.id)); }));
router.post('/', validate(investmentSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.user!.id, req.body));
}));
router.put('/:id', validate(investmentSchema), asyncHandler(async (req, res) => {
  await service.update(req.user!.id, req.params.id, req.body);
  res.status(204).send();
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  await service.delete(req.user!.id, req.params.id);
  res.status(204).send();
}));
export default router;
