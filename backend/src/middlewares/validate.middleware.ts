import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Middleware genérico de validação.
 *
 * Por que um único middleware parametrizável em vez de validar dentro de
 * cada controller?
 * - Single Responsibility Principle: o controller cuida apenas de orquestrar
 *   a chamada ao service; a validação de formato é responsabilidade deste
 *   middleware.
 * - Reutilização: qualquer rota nova só precisa passar seu schema Zod,
 *   sem duplicar lógica de parsing/erro.
 */
export function validate(schema: ZodTypeAny, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join('; ');
      throw new AppError(message, 422);
    }

    req[part] = result.data;
    next();
  };
}
