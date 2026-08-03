import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { changePasswordSchema, updateProfileSchema } from '../dto/user.dto';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new UserController();

router.use(authMiddleware);

router.get('/me', asyncHandler(controller.me));
router.put('/me', validate(updateProfileSchema), asyncHandler(controller.updateProfile));
router.put(
  '/me/password',
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword)
);

export default router;
