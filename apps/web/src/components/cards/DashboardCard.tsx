import React from "react";

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string[];
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <div
    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6
               hover:bg-slate-800/70 transition-all duration-300 cursor-pointer
               group backdrop-blur-sm"
    onClick={onClick}
  >
    <div className="flex items-center mb-4">
      <div className="bg-blue-600/20 p-3 rounded-lg group-hover:bg-blue-600/30 transition-all duration-300">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <ul className="space-y-2">
      {description.map((item, index) => (
        <li key={index} className="text-slate-300 text-sm flex items-start">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default DashboardCard;
