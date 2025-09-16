import React from "react";

interface StatsCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  hint?: string; // texto pequeño opcional (ej: +12% este mes, 3 urgentes, etc.)
  hintColor?: string; // color opcional para el hint (ej: "text-green-400")
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  value,
  label,
  hint,
  hintColor = "text-slate-400",
}) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg bg-white/5">{icon}</div>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <h3 className="text-slate-300 text-sm">{label}</h3>
      {hint && <p className={`${hintColor} text-xs mt-1`}>{hint}</p>}
    </div>
  );
};

export default StatsCard;
