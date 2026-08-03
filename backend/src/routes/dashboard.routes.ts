import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new DashboardController();

router.use(authMiddleware);

router.get('/summary', asyncHandler(controller.summary));
router.get('/chart', asyncHandler(controller.chart));

export default router;
