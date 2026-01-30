import React from 'react';

interface InfoCardProps {
    label: string;
    value: string | number;
    subValue?: string | number;
    icon?: React.ReactNode;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
    label,
    value,
    subValue,
    icon,
    className = "",
    labelClassName = "",
    valueClassName = ""
}) => {
    return (
        <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon && <div className="text-blue-600">{icon}</div>}
                <p className={`text-blue-600 font-black text-[10px] uppercase tracking-widest ${labelClassName}`}>{label}</p>
            </div>
            <p className={`text-slate-900 font-bold text-sm leading-relaxed ${valueClassName}`}>{value}</p>
            {subValue && <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-tight">{subValue}</p>}
        </div>
    );
};

export default InfoCard;
