import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
}

const toneStyles: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: 'bg-primary-50 text-primary-600',
  positive: 'bg-green-50 text-green-600',
  negative: 'bg-red-50 text-red-600',
};

export function MetricCard({ label, value, icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
