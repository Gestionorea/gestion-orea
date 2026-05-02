'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MonthlyChartProps = {
  title: string;
  incomeLabel: string;
  expenseLabel: string;
  data: { month: string; income: number; expense: number }[];
};

function formatTooltip(value: unknown) {
  const numericValue = Number(value ?? 0);
  return `$${numericValue.toFixed(2)}`;
}

export default function MonthlyChart({ title, incomeLabel, expenseLabel, data }: MonthlyChartProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Bar dataKey="income" name={incomeLabel} fill="#166534" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name={expenseLabel} fill="#991b1b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
