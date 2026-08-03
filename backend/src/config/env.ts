import 'dotenv/config';

/**
 * Centraliza a leitura das variáveis de ambiente.
 * Vantagem: se uma variável obrigatória faltar, o erro aparece
 * na inicialização (fail-fast), e não em algum ponto aleatório do código.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
