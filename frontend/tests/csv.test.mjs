import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCsvTemplate,
  computeImportedPeriodAdjustment,
  decodeCsvBytes,
  MAX_CSV_FILE_BYTES,
  summarizeSelectedRows,
  validateCsvFile,
} from '../src/utils/csv.ts';

test('decodeCsvBytes decodes UTF-8, BOM and Windows-1252 Brazilian files', () => {
  const utf8Text = '\uFEFFData;Descrição;Valor\n01/09/2026;Alimentação;-50,00';
  const utf8Bytes = new TextEncoder().encode(utf8Text);
  assert.equal(decodeCsvBytes(utf8Bytes.buffer), 'Data;Descrição;Valor\n01/09/2026;Alimentação;-50,00');

  // Windows-1252 bytes for "Descrição;Alimentação;Crédito"
  const latin1Bytes = new Uint8Array([
    0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7, 0xe3, 0x6f, 0x3b,
    0x41, 0x6c, 0x69, 0x6d, 0x65, 0x6e, 0x74, 0x61, 0xe7, 0xe3, 0x6f, 0x3b,
    0x43, 0x72, 0xe9, 0x64, 0x69, 0x74, 0x6f,
  ]);
  assert.equal(decodeCsvBytes(latin1Bytes.buffer), 'Descrição;Alimentação;Crédito');
});

test('validateCsvFile enforces .csv extension, non-empty content and 2 MB limit', () => {
  assert.equal(validateCsvFile({ name: 'extrato.CSV', size: 1024 }), null);
  assert.match(validateCsvFile({ name: 'extrato.xlsx', size: 1024 }), /\.csv/);
  assert.match(validateCsvFile({ name: 'vazio.csv', size: 0 }), /vazio/);
  assert.match(validateCsvFile({ name: 'grande.csv', size: MAX_CSV_FILE_BYTES + 1 }), /2 MB/);
});

test('buildCsvTemplate provides headers and both income and expense sample rows', () => {
  const template = buildCsvTemplate();
  assert.match(template, /^\uFEFFData;Descrição;Valor;Categoria/);
  assert.match(template, /5500,00/);
  assert.match(template, /-234,56/);
});

test('summarizeSelectedRows aggregates selected entries without float drift and counts missing categories', () => {
  const result = summarizeSelectedRows([
    { selected: true, type: 'INCOME', amount: 0.1, categoryId: 'c1' },
    { selected: true, type: 'INCOME', amount: 0.2, categoryId: 'c1' },
    { selected: true, type: 'EXPENSE', amount: 89.9, categoryId: '' },
    { selected: false, type: 'EXPENSE', amount: 999, categoryId: '' },
  ]);

  assert.deepEqual(result, {
    selectedCount: 3,
    incomeCount: 2,
    expenseCount: 1,
    incomeTotal: 0.3,
    expenseTotal: 89.9,
    missingCategoryCount: 1,
  });
});

test('computeImportedPeriodAdjustment expands period only when needed and respects 120-month limit', () => {
  const current = { startDate: '2026-04-01', endDate: '2026-09-30' };
  assert.equal(computeImportedPeriodAdjustment(current, ['2026-05-01', '2026-09-15']), null);
  assert.deepEqual(
    computeImportedPeriodAdjustment(current, ['2026-02-10', '2026-10-05']),
    { startDate: '2026-02-10', endDate: '2026-10-05' },
  );
  // Combined span exceeds 120 months -> falls back to imported dates span
  assert.deepEqual(
    computeImportedPeriodAdjustment(current, ['2010-01-01', '2010-01-31']),
    { startDate: '2010-01-01', endDate: '2010-01-31' },
  );
});
