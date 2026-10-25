import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCurrency, formatDate } from '../src/utils/format.ts';
import { getDashboardPeriod, savingsRate, validateDashboardPeriod, formatPercentage } from '../src/utils/dashboard.ts';

test('six months includes the current month and crosses the year boundary', () => {
  assert.deepEqual(getDashboardPeriod('lastSixMonths', new Date(2026, 1, 15)), {
    startDate: '2025-09-01', endDate: '2026-02-28',
  });
});

test('current month uses all calendar days, including leap day', () => {
  assert.deepEqual(getDashboardPeriod('currentMonth', new Date(2028, 1, 1)), {
    startDate: '2028-02-01', endDate: '2028-02-29',
  });
});

test('previous month handles January without moving dates through UTC', () => {
  assert.deepEqual(getDashboardPeriod('previousMonth', new Date(2026, 0, 1, 0, 1)), {
    startDate: '2025-12-01', endDate: '2025-12-31',
  });
});

test('presets at the end of a day use the local calendar', () => {
  assert.deepEqual(getDashboardPeriod('currentMonth', new Date(2026, 9, 31, 23, 59)), {
    startDate: '2026-10-01', endDate: '2026-10-31',
  });
});

test('custom dates accept inclusive one-day intervals and leap days', () => {
  assert.equal(validateDashboardPeriod({ startDate: '2028-02-29', endDate: '2028-02-29' }), null);
});

test('custom dates reject reversed intervals', () => {
  assert.match(validateDashboardPeriod({ startDate: '2026-10-31', endDate: '2026-10-01' }), /anterior ou igual/);
});

test('custom dates reject empty, impossible and incorrectly formatted dates', () => {
  for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01', 'invalid']) {
    assert.match(validateDashboardPeriod({ startDate: date, endDate: '2026-12-31' }), /datas válidas/);
    assert.match(validateDashboardPeriod({ startDate: '2026-01-01', endDate: date }), /datas válidas/);
  }
});

test('custom chart ranges are limited to 120 calendar months', () => {
  assert.equal(validateDashboardPeriod({ startDate: '2017-01-01', endDate: '2026-12-31' }), null);
  assert.match(validateDashboardPeriod({ startDate: '2016-12-31', endDate: '2026-12-31' }), /120 meses/);
  assert.match(validateDashboardPeriod({ startDate: '1000-01-01', endDate: '9999-12-31' }), /120 meses/);
});

test('savings rate uses the period result and allows a deficit below -100%', () => {
  assert.equal(savingsRate(1000, 250), 25);
  assert.equal(savingsRate(1000, -1500), -150);
  assert.equal(savingsRate(1000, 1000), 100);
  assert.equal(savingsRate(1000, 0), 0);
});

test('zero income has no meaningful savings percentage, including expense-only periods', () => {
  assert.equal(savingsRate(0, 0), null);
  assert.equal(savingsRate(0, -100), null);
});

test('savings rate rounds decimal money and does not display negative zero', () => {
  assert.equal(savingsRate(300, 100), 33.3);
  assert.equal(savingsRate(0.3, 0.1), 33.3);
  assert.equal(savingsRate(1000, -0.01), 0);
  assert.equal(savingsRate(80, 1), 1.3);
  assert.equal(savingsRate(80, -1), -1.3);
});

test('Brazilian format preserves negative amounts and the calendar date', () => {
  assert.equal(formatCurrency(-1234.56).replace(/\s/g, ' '), '-R$ 1.234,56');
  assert.equal(formatCurrency(0).replace(/\s/g, ' '), 'R$ 0,00');
  assert.equal(formatDate('2026-10-01'), '01/10/2026');
  assert.equal(formatPercentage(-33.3), '-33,3%');
});
