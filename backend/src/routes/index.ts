import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';

/**
 * Agregador de rotas. `app.ts` conhece apenas este arquivo,
 * não cada módulo de rota individualmente — facilita adicionar/remover
 * módulos de rota sem tocar em app.ts.
 */
const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);

export default router;
