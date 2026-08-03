import { z } from 'zod';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const createTransactionSchema = z.object({
  description: z.string().trim().min(2, 'Descrição deve ter no mínimo 2 caracteres').max(255),
  amount: z.number().positive('O valor deve ser positivo'),
  type: transactionTypeSchema,
  date: z.coerce.date(),
  categoryId: z.string().uuid('categoryId inválido'),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTransactionDTO = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDTO = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryDTO = z.infer<typeof transactionQuerySchema>;
