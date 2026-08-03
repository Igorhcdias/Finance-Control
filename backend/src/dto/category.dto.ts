import { z } from 'zod';

const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(50),
  color: z.string().regex(hexColorRegex, 'Cor deve estar em formato hexadecimal, ex: #3B82F6'),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
