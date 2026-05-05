'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TopMerchantsYearCardProps = {
  title: string;
  emptyLabel: string;
  data: { merchantName: string; total: number; count: number }[];
};

const MAX_LABEL_LENGTH = 28;

function truncateLabel(value: unknown): string {
  const text = String(value ?? '');
  if (text.length <= MAX_LABEL_LENGTH) return text;
  return text.slice(0, MAX_LABEL_LENGTH - 1) + '…';
}

function formatTooltip(value: unknown) {
  const numericValue = Number(value ?? 0);
  return `$${numericValue.toFixed(2)}`;
}

export default function TopMerchantsYearCard({ title, emptyLabel, data }: TopMerchantsYearCardProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="mt-6 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="merchantName"
                width={240}
                tickLine={false}
                axisLine={false}
                tickFormatter={truncateLabel}
              />
              <Tooltip formatter={formatTooltip} labelFormatter={(label: unknown) => String(label ?? '')} />
              <Bar dataKey="total" fill="#111827" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
