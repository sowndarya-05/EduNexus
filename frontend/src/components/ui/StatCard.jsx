import React from 'react';

const StatCard = ({ label, value, change, changeType, icon: Icon, color }) => {
    // Map colors to tailwind classes
    const colorClasses = {
        indigo: { iconBg: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100/50' },
        purple: { iconBg: 'bg-purple-50 text-purple-600', border: 'border-purple-100/50' },
        green: { iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100/50' },
        orange: { iconBg: 'bg-amber-50 text-amber-600', border: 'border-amber-100/50' },
        blue: { iconBg: 'bg-blue-50 text-blue-600', border: 'border-blue-100/50' },
        red: { iconBg: 'bg-rose-50 text-rose-600', border: 'border-rose-100/50' }
    };

    const badgeClasses = {
        positive: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
        negative: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10',
        neutral: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/10'
    };

    const scheme = colorClasses[color] || colorClasses.indigo;
    const badgeStyle = badgeClasses[changeType] || badgeClasses.neutral;

    return (
        <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">
                        {label}
                    </p>
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2.5">
                        {value}
                    </h3>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${scheme.iconBg}`}>
                    <Icon />
                </div>
            </div>
            {change && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100/80">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                        {change}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">vs previous period</span>
                </div>
            )}
        </div>
    );
};

export default StatCard;
