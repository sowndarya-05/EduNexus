import React from 'react';
import { FaRobot } from 'react-icons/fa';

const AIAlert = ({ title, message, variant = 'warning', onAction, actionLabel }) => {
    const variantStyles = {
        warning: {
            bg: 'bg-gradient-to-r from-amber-50/80 to-orange-50/80',
            border: 'border-l-4 border-amber-500',
            text: 'text-amber-900',
            desc: 'text-amber-800/90',
            iconColor: 'text-amber-600',
            btn: 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/50'
        },
        info: {
            bg: 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80',
            border: 'border-l-4 border-blue-500',
            text: 'text-blue-900',
            desc: 'text-blue-800/90',
            iconColor: 'text-blue-600',
            btn: 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-100/50'
        },
        success: {
            bg: 'bg-gradient-to-r from-emerald-50/80 to-teal-50/80',
            border: 'border-l-4 border-emerald-500',
            text: 'text-emerald-900',
            desc: 'text-emerald-800/90',
            iconColor: 'text-emerald-600',
            btn: 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100/50'
        },
        danger: {
            bg: 'bg-gradient-to-r from-rose-50/80 to-red-50/80',
            border: 'border-l-4 border-rose-500',
            text: 'text-rose-900',
            desc: 'text-rose-800/90',
            iconColor: 'text-rose-600',
            btn: 'bg-white text-rose-900 border border-rose-200 hover:bg-rose-100/50'
        }
    };

    const styles = variantStyles[variant] || variantStyles.warning;

    return (
        <div className={`rounded-2xl p-5 my-6 border border-slate-100 shadow-sm transition-all duration-300 ${styles.bg} ${styles.border}`}>
            <div className="flex gap-4 items-start">
                <div className={`text-2xl mt-0.5 p-2 rounded-xl bg-white/80 shadow-sm ${styles.iconColor}`}>
                    <FaRobot />
                </div>
                <div className="flex-1">
                    <h4 className={`text-base font-bold tracking-tight ${styles.text}`}>
                        {title}
                    </h4>
                    <p className={`text-sm mt-1.5 font-medium leading-relaxed ${styles.desc}`}>
                        {message}
                    </p>
                    {onAction && actionLabel && (
                        <button 
                            onClick={onAction} 
                            className={`mt-4 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.98] ${styles.btn}`}
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAlert;
