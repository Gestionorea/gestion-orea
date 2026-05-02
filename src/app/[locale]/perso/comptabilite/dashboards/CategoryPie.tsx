'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#111827', '#166534', '#991b1b', '#854d0e', '#1d4ed8', '#6b7280', '#7c3aed', '#0f766e'];

type CategoryPieProps = {
  title: string;
  emptyLabel: string;
  data: { category: string; total: number; count: number }[];
};

function formatTooltip(value: unknown) {
  const numericValue = Number(value ?? 0);
  return `$${numericValue.toFixed(2)}`;
}

export default function CategoryPie({ title, emptyLabel, data }: CategoryPieProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="category" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
