import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Middleware central de tratamento de erros (deve ser o ÚLTIMO middleware
 * registrado em app.ts).
 *
 * Por que centralizar aqui?
 * - Controllers e services apenas lançam (`throw`) erros; nenhum deles
 *   precisa saber como formatar uma resposta HTTP de erro.
 * - Um único lugar decide o "contrato" de erro da API inteira, garantindo
 *   respostas consistentes (`{ message: string }`) para o frontend.
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Erros conhecidos do Prisma (ex: violação de constraint UNIQUE)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Registro já existe com esses dados (violação de unicidade)' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ message: 'Operação viola uma restrição de integridade referencial' });
      return;
    }
  }

  console.error('[Erro não tratado]', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
}
