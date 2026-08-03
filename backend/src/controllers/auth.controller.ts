import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';

/**
 * Controller: única responsabilidade é traduzir HTTP <-> Service.
 * Nenhuma regra de negócio mora aqui — se o controller precisar de um "if"
 * de regra de negócio, é sinal de que ele está fazendo o trabalho do Service.
 */
const authService = new AuthService(new UserRepository());

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }
}
