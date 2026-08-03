import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * O Express 4 não encaminha automaticamente rejeições de Promises para o
 * middleware de erro. Este wrapper evita que cada controller precise repetir
 * um bloco try/catch manualmente (DRY), delegando qualquer erro para o
 * `errorMiddleware` via `next(error)`.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
