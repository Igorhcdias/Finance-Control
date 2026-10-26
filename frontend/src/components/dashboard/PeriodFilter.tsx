import { useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDate } from '../../utils/format';
import { getDashboardPeriod, validateDashboardPeriod, type DashboardPeriod, type DashboardPreset } from '../../utils/dashboard';

interface PeriodFilterProps {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  heading?: string;
}

export function PeriodFilter({ period, onChange, heading = 'Período da visão geral' }: PeriodFilterProps) {
  const [preset, setPreset] = useState<DashboardPreset>('lastSixMonths');
  const [draft, setDraft] = useState(period);
  const [error, setError] = useState<string | null>(null);

  function selectPreset(value: DashboardPreset) {
    setPreset(value);
    setError(null);
    if (value !== 'custom') {
      const next = getDashboardPeriod(value);
      setDraft(next);
      onChange(next);
    } else {
      setDraft(period);
    }
  }

  function applyCustom(event: FormEvent) {
    event.preventDefault();
    const message = validateDashboardPeriod(draft);
    setError(message);
    if (!message) onChange(draft);
  }

  return (
    <section aria-label="Filtro de período" className="card min-w-0 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CalendarDays size={20} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
          <div className="min-w-0">
            <label htmlFor="dashboard-period" className="block text-sm font-medium text-gray-900">{heading}</label>
            <p className="mt-1 text-xs leading-5 text-gray-500">{formatDate(period.startDate)} a {formatDate(period.endDate)} · pela data do lançamento</p>
          </div>
        </div>
        <select id="dashboard-period" value={preset} onChange={(event) => selectPreset(event.target.value as DashboardPreset)} className="input-field min-h-11 min-w-0 xl:w-auto">
          <option value="currentMonth">Mês atual</option>
          <option value="previousMonth">Mês anterior</option>
          <option value="lastSixMonths">Últimos seis meses</option>
          <option value="custom">Período personalizado</option>
        </select>
      </div>
      {preset === 'custom' && (
        <form onSubmit={applyCustom} noValidate className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs text-gray-500">Selecione até 120 meses. As datas serão aplicadas ao confirmar.</p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
            <div className="min-w-0">
              <label htmlFor="dashboard-start" className="label-field">Data inicial</label>
              <input id="dashboard-start" type="date" value={draft.startDate} min="1000-01-01" max={draft.endDate || '9999-12-31'} aria-invalid={!!error} aria-describedby={error ? 'dashboard-period-error' : undefined} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="input-field min-h-11 min-w-0" />
            </div>
            <div className="min-w-0">
              <label htmlFor="dashboard-end" className="label-field">Data final</label>
              <input id="dashboard-end" type="date" value={draft.endDate} min={draft.startDate || '1000-01-01'} max="9999-12-31" aria-invalid={!!error} aria-describedby={error ? 'dashboard-period-error' : undefined} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="input-field min-h-11 min-w-0" />
            </div>
            <button type="submit" className="btn-secondary min-h-11 sm:col-span-2 xl:col-span-1">Aplicar período</button>
          </div>
          {error && <p id="dashboard-period-error" role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  );
}
