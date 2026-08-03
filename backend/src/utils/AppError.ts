/**
 * Erro de aplicação (erro de negócio previsível, ex: "e-mail já cadastrado").
 *
 * Por que uma classe própria e não `throw new Error(...)`?
 * Separar erros de negócio (esperados, com status HTTP definido) de erros
 * inesperados (bugs, falhas de infraestrutura) permite que o middleware de
 * erro devolva mensagens amigáveis para o primeiro caso e "500 Internal
 * Server Error" genérico para o segundo, sem vazar detalhes internos.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
