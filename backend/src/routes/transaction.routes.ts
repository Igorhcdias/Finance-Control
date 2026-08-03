import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTransactionSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from '../dto/transaction.dto';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new TransactionController();

router.use(authMiddleware);

router.post('/', validate(createTransactionSchema), asyncHandler(controller.create));
router.get('/', validate(transactionQuerySchema, 'query'), asyncHandler(controller.list));
router.put('/:id', validate(updateTransactionSchema), asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.delete));

export default router;
