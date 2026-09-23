import React from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';

const Navbar = ({ user, toggleSidebar, sidebarOpen }) => {
    return (
        <nav className="flex items-center justify-between h-20 px-6 lg:px-10 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                    {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                </button>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-indigo-600 tracking-widest uppercase">
                        AI Portal
                    </span>
                    <span className="text-base font-bold text-slate-800 tracking-tight">
                        EduPredict Intelligence
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800 leading-none">{user?.name}</p>
                    <p className="text-xs text-slate-400 font-medium capitalize mt-1">{user?.role?.toLowerCase()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 ring-2 ring-indigo-50/50">
                    <span>{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
