import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCategorySchema, updateCategorySchema } from '../dto/category.dto';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new CategoryController();

router.use(authMiddleware); // todas as rotas de categoria exigem autenticação

router.post('/', validate(createCategorySchema), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.put('/:id', validate(updateCategorySchema), asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.delete));

export default router;
