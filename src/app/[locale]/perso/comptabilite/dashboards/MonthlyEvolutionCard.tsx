'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MonthlyEvolutionCardProps = {
  title: string;
  incomeLabel: string;
  expenseLabel: string;
  data: { month: string; income: number; expense: number }[];
};

function formatTooltip(value: unknown) {
  const numericValue = Number(value ?? 0);
  return `$${numericValue.toFixed(2)}`;
}

export default function MonthlyEvolutionCard({
  title,
  incomeLabel,
  expenseLabel,
  data,
}: MonthlyEvolutionCardProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line type="monotone" dataKey="income" name={incomeLabel} stroke="#166534" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" name={expenseLabel} stroke="#991b1b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
