export type DashboardPreset = 'currentMonth' | 'previousMonth' | 'lastSixMonths' | 'custom';

export interface DashboardPeriod {
  startDate: string;
  endDate: string;
}

function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Calendar dates avoid UTC conversions that can shift a day. */
export function getDashboardPeriod(preset: Exclude<DashboardPreset, 'custom'>, now = new Date()): DashboardPeriod {
  const monthOffset = preset === 'previousMonth' ? -1 : 0;
  const firstOffset = preset === 'lastSixMonths' ? -5 : monthOffset;
  return {
    startDate: calendarDate(new Date(now.getFullYear(), now.getMonth() + firstOffset, 1)),
    endDate: calendarDate(new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0)),
  };
}

function isCalendarDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateDashboardPeriod(period: DashboardPeriod): string | null {
  if (!isCalendarDate(period.startDate) || !isCalendarDate(period.endDate)) {
    return 'Informe as duas datas válidas para aplicar o período.';
  }
  if (period.startDate > period.endDate) return 'A data inicial deve ser anterior ou igual à data final.';
  const [startYear, startMonth] = period.startDate.split('-').map(Number);
  const [endYear, endMonth] = period.endDate.split('-').map(Number);
  if ((endYear - startYear) * 12 + endMonth - startMonth >= 120) {
    return 'Escolha um intervalo de até 120 meses para manter o gráfico legível.';
  }
  return null;
}

/** Reuse the backend result displayed in the result card. */
export function savingsRate(income: number, result: number): number | null {
  if (income === 0) return null;
  const rounded = Math.sign(result / income) * Math.round(Math.abs(result / income) * 1000) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatPercentage(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
