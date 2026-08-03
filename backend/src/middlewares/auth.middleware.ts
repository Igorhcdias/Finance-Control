import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

/**
 * Middleware de autenticação.
 * Intercepta a requisição ANTES de chegar ao controller, valida o token JWT
 * e anexa o usuário ao `req.user`. Isso centraliza a regra "rota protegida
 * exige autenticação" (RF13) em um único lugar, em vez de repetir a
 * verificação em cada controller (evita duplicação / baixo acoplamento).
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('Token de autenticação não informado', 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Formato de token inválido', 401);
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw new AppError('Token inválido ou expirado', 401);
  }
}
