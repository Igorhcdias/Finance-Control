import { z } from 'zod';
export const investmentSchema = z.object({
  description: z.string().trim().min(1, 'Informe uma descrição').max(255),
  amount: z.number().finite().positive().max(9999999999.99)
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, 'Use no máximo duas casas decimais'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Informe uma data válida'),
});
export type InvestmentInput = z.infer<typeof investmentSchema>;
