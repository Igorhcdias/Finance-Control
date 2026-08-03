import { z } from 'zod';

/**
 * DTO (Data Transfer Object) + validação.
 *
 * Por que usar Zod para os DTOs?
 * - Uma única definição gera tanto a validação em runtime quanto o tipo
 *   estático (via z.infer), eliminando a duplicação de "escrever a
 *   interface" e "escrever a validação" separadamente (DRY).
 * - Erros de validação são barrados na borda da aplicação (camada de rota/
 *   controller), garantindo que services e repositories sempre recebam
 *   dados já validados e íntegros.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().trim().email('E-mail inválido').max(150),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
