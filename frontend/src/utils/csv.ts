export const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024;

export function decodeCsvBytes(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export function validateCsvFile(file: { name: string; size: number }): string | null {
  if (!/\.csv$/i.test(file.name.trim())) {
    return 'Selecione um arquivo com extensão .csv.';
  }
  if (file.size <= 0) {
    return 'O arquivo selecionado está vazio.';
  }
  if (file.size > MAX_CSV_FILE_BYTES) {
    return 'O arquivo excede o tamanho máximo de 2 MB.';
  }
  return null;
}

export function buildCsvTemplate(): string {
  return [
    '\uFEFFData;Descrição;Valor;Categoria',
    '05/09/2026;Salário Mensal;5500,00;Receitas',
    '06/09/2026;Supermercado Bom Preço;-234,56;Alimentação',
    '10/09/2026;Restaurante Sabor;-89,90;Alimentação',
  ].join('\r\n');
}

export interface SelectedRowSummary {
  selectedCount: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  missingCategoryCount: number;
}

export function summarizeSelectedRows(
  rows: Array<{
    selected: boolean;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    categoryId: string;
  }>,
): SelectedRowSummary {
  let selectedCount = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let incomeCents = 0;
  let expenseCents = 0;
  let missingCategoryCount = 0;

  for (const row of rows) {
    if (!row.selected) continue;
    selectedCount += 1;
    const cents = Math.round(row.amount * 100);
    if (row.type === 'INCOME') {
      incomeCount += 1;
      incomeCents += cents;
    } else {
      expenseCount += 1;
      expenseCents += cents;
    }
    if (!row.categoryId) {
      missingCategoryCount += 1;
    }
  }

  return {
    selectedCount,
    incomeCount,
    expenseCount,
    incomeTotal: incomeCents / 100,
    expenseTotal: expenseCents / 100,
    missingCategoryCount,
  };
}

function monthsBetween(startDate: string, endDate: string): number {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [endYear, endMonth] = endDate.split('-').map(Number);
  return (endYear - startYear) * 12 + endMonth - startMonth;
}

export function computeImportedPeriodAdjustment(
  current: { startDate: string; endDate: string },
  importedDates: string[],
): { startDate: string; endDate: string } | null {
  const validDates = importedDates.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (validDates.length === 0) return null;

  let minImported = validDates[0];
  let maxImported = validDates[0];
  for (const dateStr of validDates) {
    if (dateStr < minImported) minImported = dateStr;
    if (dateStr > maxImported) maxImported = dateStr;
  }

  if (minImported >= current.startDate && maxImported <= current.endDate) {
    return null;
  }

  const expandedStart = minImported < current.startDate ? minImported : current.startDate;
  const expandedEnd = maxImported > current.endDate ? maxImported : current.endDate;

  if (monthsBetween(expandedStart, expandedEnd) < 120) {
    return { startDate: expandedStart, endDate: expandedEnd };
  }
  if (monthsBetween(minImported, maxImported) < 120) {
    return { startDate: minImported, endDate: maxImported };
  }
  return null;
}

