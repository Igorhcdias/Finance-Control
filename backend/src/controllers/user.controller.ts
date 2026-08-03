import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';

const userService = new UserService(new UserRepository());

export class UserController {
  async me(req: Request, res: Response) {
    const profile = await userService.getProfile(req.user!.id);
    res.status(200).json(profile);
  }

  async updateProfile(req: Request, res: Response) {
    const profile = await userService.updateProfile(req.user!.id, req.body);
    res.status(200).json(profile);
  }

  async changePassword(req: Request, res: Response) {
    await userService.changePassword(req.user!.id, req.body);
    res.status(204).send();
  }
}
