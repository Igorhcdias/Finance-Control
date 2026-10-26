import { z } from 'zod';

export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter no mínimo 2 caracteres')
  .max(50, 'Nome deve ter no máximo 50 caracteres');
