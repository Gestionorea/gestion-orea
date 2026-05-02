type StatsCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export default function StatsCard({ label, value, helper }: StatsCardProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-medium text-black">{value}</p>
      {helper ? <p className="mt-2 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}
