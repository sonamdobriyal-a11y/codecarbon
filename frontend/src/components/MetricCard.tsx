type MetricCardProps = {
  label: string;
  value: string;
  accent?: string;
};

export function MetricCard({ label, value, accent = "from-cyan-500 to-blue-500" }: MetricCardProps) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-2xl font-semibold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  );
}
