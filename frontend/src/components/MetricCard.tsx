import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
  description?: string;
}

const toneStyles: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: 'bg-primary-50 text-primary-600',
  positive: 'bg-emerald-50 text-emerald-600',
  negative: 'bg-red-50 text-red-600',
};

const valueStyles: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: 'text-gray-900',
  positive: 'text-emerald-700',
  negative: 'text-red-700',
};

export function MetricCard({ label, value, icon, tone = 'neutral', description }: MetricCardProps) {
  return (
    <div className="card flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium text-gray-600">{label}</p>
        <div aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
          {icon}
        </div>
      </div>
      <p className={`break-words text-2xl font-semibold tabular-nums tracking-tight ${valueStyles[tone]}`}>{value}</p>
      {description && <p className="mt-auto text-xs leading-relaxed text-gray-500">{description}</p>}
    </div>
  );
}
