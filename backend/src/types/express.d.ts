// Aumenta a tipagem do Express para que o middleware de autenticação
// possa anexar o usuário autenticado ao request de forma tipada,
// evitando o uso de "any" em todos os controllers.
export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
