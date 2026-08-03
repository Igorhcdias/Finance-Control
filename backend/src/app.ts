import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import { errorMiddleware } from './middlewares/error.middleware';

/**
 * app.ts x server.ts:
 * Separar a configuração do Express (aqui) da inicialização do servidor HTTP
 * (server.ts) permite testar `app` com supertest sem precisar abrir uma porta
 * real de rede — importante para testes de integração rápidos e isolados.
 */
export const app = express();

app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', routes);

// Middleware de erro DEVE ser o último registrado.
app.use(errorMiddleware);
