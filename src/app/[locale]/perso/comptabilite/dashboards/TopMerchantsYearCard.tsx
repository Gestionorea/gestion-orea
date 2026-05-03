'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TopMerchantsYearCardProps = {
  title: string;
  emptyLabel: string;
  data: { merchantName: string; total: number; count: number }[];
};

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
                width={130}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={formatTooltip} />
              <Bar dataKey="total" fill="#111827" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
