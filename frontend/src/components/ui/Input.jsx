import React from 'react';

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    required = false,
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className={`w-full px-4 py-2.5 text-slate-800 bg-slate-50/40 border rounded-xl 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white
                  transition-all duration-150 ${error ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'}
                  hover:border-slate-300`}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
            )}
        </div>
    );
};

export default Input;
